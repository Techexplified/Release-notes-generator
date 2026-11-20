import { toPastTense } from './past-tense.js';
import { formatDateLong } from './format-date.js';
import { CHECKLIST_LAYOUT } from '../config/generation.js';

/**
 * Extracts and sorts check items across all checklists for a card.
 * Ordered by checklist pos, then item pos.
 * Trims names, skips empty names, filters by completedOnly if requested,
 * and capitalizes the first letter of each item leaving other wording untouched.
 *
 * @param {Object} card
 * @param {boolean} completedOnly
 * @returns {Array<{ id: string, name: string, displayName: string, state: string }>}
 */
function getCardChecklistItems(card, completedOnly = false) {
  if (!card || !Array.isArray(card.checklists) || card.checklists.length === 0) {
    return [];
  }

  const sortedChecklists = [...card.checklists].sort((a, b) => (a.pos || 0) - (b.pos || 0));
  const items = [];

  for (const cl of sortedChecklists) {
    if (!Array.isArray(cl.checkItems) || cl.checkItems.length === 0) continue;
    const sortedItems = [...cl.checkItems].sort((a, b) => (a.pos || 0) - (b.pos || 0));

    for (const item of sortedItems) {
      const rawName = (item.name || '').trim();
      if (!rawName) continue;
      if (completedOnly && item.state !== 'complete') continue;

      // Capitalize first letter, keep other wording intact (no rewrite, no added punctuation)
      const capitalized = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      items.push({
        ...item,
        displayName: capitalized
      });
    }
  }

  return items;
}

/**
 * Appends link and description elements to an <li> container.
 */
function appendLinkAndDesc(li, card, include, template) {
  // Optional card link
  if (include.links && card.url && card.url.startsWith('https://')) {
    li.appendChild(document.createTextNode(' '));
    const a = document.createElement('a');
    a.className = 'card-link';
    a.href = card.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = template.linkLabel || 'View card';
    li.appendChild(a);
  }

  // Optional card description
  if (include.descriptions && card.desc && typeof card.desc === 'string') {
    const descClean = card.desc.replace(/\s+/g, ' ').trim();
    if (descClean) {
      const descDiv = document.createElement('div');
      descDiv.className = 'item-desc';
      // First 160 characters with ellipsis if cut
      // // TODO: strip Trello markdown from descriptions
      if (descClean.length > 160) {
        descDiv.textContent = descClean.slice(0, 160).trim() + '...';
      } else {
        descDiv.textContent = descClean;
      }
      li.appendChild(descDiv);
    }
  }
}

/**
 * Pure generator function returning a DocumentFragment containing formatted release notes.
 * Strictly uses createElement and textContent for all Trello card and user data (no innerHTML).
 *
 * @param {Object} params
 * @param {Object} params.template - Template configuration from src/config/templates.js
 * @param {Object} params.release - { title, version, date }
 * @param {Object} params.categories - { feature: string[], improvement: string[], bugfix: string[] }
 * @param {Array} params.cards - Array of Trello card objects
 * @param {Object} params.include - { descriptions: bool, links: bool, date: bool, version: bool, completedOnly?: bool }
 * @returns {DocumentFragment}
 */
export function generateNotes({ template, release, categories, cards, include }) {
  const fragment = document.createDocumentFragment();
  const cardMap = new Map((cards || []).map((c) => [c.id, c]));

  // Category counts used by the executive intro still count cards, not bullets
  const counts = {
    feature: Array.isArray(categories?.feature) ? categories.feature.length : 0,
    improvement: Array.isArray(categories?.improvement) ? categories.improvement.length : 0,
    bugfix: Array.isArray(categories?.bugfix) ? categories.bugfix.length : 0
  };

  const releaseTitle = release?.title ? release.title.trim() : 'Release notes';
  const version = release?.version ? release.version.trim() : '';
  const dateISO = release?.date || '';
  const dateFormatted = dateISO ? formatDateLong(dateISO) : '';

  const ctx = {
    releaseTitle,
    version,
    dateISO,
    dateFormatted,
    counts,
    include: include || { descriptions: true, links: true, date: true, version: true, completedOnly: false }
  };

  // 1. Heading (<h1 class="doc-title">)
  const h1 = document.createElement('h1');
  h1.className = 'doc-title';
  h1.textContent = template.headingText(ctx);
  fragment.appendChild(h1);

  // 2. Meta line (<p class="doc-meta">)
  const metaText = template.metaText(ctx);
  if (metaText) {
    const metaP = document.createElement('p');
    metaP.className = 'doc-meta';
    metaP.textContent = metaText;
    fragment.appendChild(metaP);
  }

  // 3. Intro paragraph
  const introText = template.introText(ctx);
  if (introText) {
    const introP = document.createElement('p');
    introP.textContent = introText;
    fragment.appendChild(introP);
  }

  // 4. Render non-empty sections in order: feature, improvement, bugfix
  const categoryKeys = ['feature', 'improvement', 'bugfix'];

  categoryKeys.forEach((catKey) => {
    const cardIds = categories?.[catKey];
    if (!Array.isArray(cardIds) || cardIds.length === 0) return;

    // Filter to existing cards
    const categoryCards = cardIds.map((id) => cardMap.get(id)).filter(Boolean);
    if (categoryCards.length === 0) return;

    // Section Heading <h2 class="band band-{id}" data-category="{id}">
    const h2 = document.createElement('h2');
    h2.className = `band band-${catKey}`;
    h2.setAttribute('data-category', catKey);

    const emoji = template.sectionEmoji?.[catKey];
    if (emoji) {
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'band-icon';
      emojiSpan.textContent = emoji + ' ';
      h2.appendChild(emojiSpan);
    }

    const sectionLabelText = template.sectionLabels?.[catKey] || catKey;
    const cleanLabel = emoji && sectionLabelText.startsWith(emoji)
      ? sectionLabelText.slice(emoji.length).trim()
      : sectionLabelText;

    const labelTextNode = document.createTextNode(cleanLabel);
    h2.appendChild(labelTextNode);
    fragment.appendChild(h2);

    // Section Card List <ul>
    const ul = document.createElement('ul');

    categoryCards.forEach((card) => {
      const checklistItems = getCardChecklistItems(card, Boolean(include.completedOnly));
      const hasItems = checklistItems.length > 0;

      // Card title text (rewritten per template)
      const cardTitleText = template.rewrite === 'pastTense'
        ? toPastTense(card.name)
        : (card.name || '');

      if (CHECKLIST_LAYOUT === 'nested' || !hasItems) {
        // --- Nested Mode (or Fallback if no checklist items) ---
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(cardTitleText));

        // Append link & desc to the card <li>
        appendLinkAndDesc(li, card, include, template);

        // Nested <ul class="sub-items"> for checklist items
        if (hasItems) {
          const subUl = document.createElement('ul');
          subUl.className = 'sub-items';

          checklistItems.forEach((item) => {
            const subLi = document.createElement('li');
            subLi.textContent = item.displayName;
            subUl.appendChild(subLi);
          });

          li.appendChild(subUl);
        }

        ul.appendChild(li);
      } else {
        // --- Flat Mode ---
        // Each checklist item becomes its own <li>; card title is omitted.
        // Link and description attach to the LAST bullet.
        checklistItems.forEach((item, index) => {
          const li = document.createElement('li');
          li.appendChild(document.createTextNode(item.displayName));

          if (index === checklistItems.length - 1) {
            appendLinkAndDesc(li, card, include, template);
          }

          ul.appendChild(li);
        });
      }
    });

    fragment.appendChild(ul);
  });

  return fragment;
}
