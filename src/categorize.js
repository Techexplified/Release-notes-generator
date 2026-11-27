import { APP_KEY, APP_NAME, APP_AUTHOR } from './config.js';
import { renderHeader } from './components/header.js';
import { renderStepper } from './components/stepper.js';
import { CATEGORIES, categorize } from './config/categories.js';
import { getCardsForList, getCardsByIds } from './data/data-source.js';
import { loadDraft, saveDraft } from './state/draft.js';
import { getIcon } from './components/icons.js';
import { initTrelloIframe, navigateTo } from './lib/trello-context.js';

// Initialize Trello iframe client
const t = initTrelloIframe();

// State
let currentDraft = null;
let selectedCards = []; // Array of card objects currently included
let cardMap = new Map(); // id -> card object
let categoriesState = {
  feature: [],
  improvement: [],
  bugfix: [],
  uncategorized: []
};
let activePickerCategoryId = null; // ID of currently open inline picker
let activeChevronButton = null; // Reference to chevron element that opened the picker
let autosaveTimer = null;

// DOM Elements
const headerRoot = document.getElementById('header-root');
const stepperRoot = document.getElementById('stepper-root');
const wizardBodyMain = document.getElementById('wizard-body-main');
const titleInput = document.getElementById('release-title-input');
const versionInput = document.getElementById('release-version-input');
const dateInput = document.getElementById('release-date-input');
const datePickerTrigger = document.getElementById('date-picker-trigger');
const dateDisplayText = document.getElementById('date-display-text');
const titleError = document.getElementById('title-error');
const dateError = document.getElementById('date-error');
const totalCardsCountBadge = document.getElementById('total-cards-count');
const categoriesContainer = document.getElementById('categorize-cards-container');
const categoryErrorContainer = document.getElementById('category-error-container');
const btnBack = document.getElementById('btn-back');
const btnNext = document.getElementById('btn-next');
const srAnnouncements = document.getElementById('sr-announcements');

// Back button handler (registered immediately so Back works at all times, including error states)
if (btnBack) {
  btnBack.addEventListener('click', async () => {
    btnBack.disabled = true;
    try {
      await Promise.race([
        saveCurrentDraft(),
        new Promise((resolve) => setTimeout(resolve, 250))
      ]);
    } catch (err) {
      // Non-blocking draft save failure
    }
    navigateTo('select-cards.html');
  });
}

// Next button handler (registered immediately so Next works reliably and never hangs)
if (btnNext) {
  btnNext.addEventListener('click', async () => {
    if (!validateForm()) return;

    btnNext.disabled = true;

    // Cache selected cards immediately so Step 3 has them synchronously in memory
    try {
      sessionStorage.setItem('selectedCardsCache', JSON.stringify(selectedCards));
    } catch (cacheErr) {
      // Storage quota or privacy restriction
    }

    try {
      await Promise.race([
        saveCurrentDraft(),
        new Promise((resolve) => setTimeout(resolve, 300))
      ]);
    } catch (err) {
      // Non-blocking draft save failure
    }

    // Navigate to Step 3 (Preview & Edit)
    navigateTo('preview.html');
  });
}

/**
 * Returns today's local date as YYYY-MM-DD (no timezone conversion).
 */
function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD date string as "Jan 28, 2026".
 */
function formatLocalDate(isoDateStr) {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateObj);
}

/**
 * Announces message to screen readers via aria-live region.
 */
function announce(message) {
  if (srAnnouncements) {
    srAnnouncements.textContent = '';
    // Small timeout ensures screen readers re-read text
    setTimeout(() => {
      srAnnouncements.textContent = message;
    }, 50);
  }
}

/**
 * Extracts union of card IDs from categories object.
 */
function getUnionOfCategories(categories) {
  if (!categories || typeof categories !== 'object') return [];
  const union = [];
  for (const key of ['feature', 'improvement', 'bugfix', 'uncategorized']) {
    if (Array.isArray(categories[key])) {
      union.push(...categories[key]);
    }
  }
  return union;
}

/**
 * Reconciles categories on load:
 * - Keeps existing assignments for cards still selected
 * - Adds newly selected cards to category returned by categorize(card)
 * - Drops cards no longer selected
 */
function reconcileCategories(cards, draftCategories) {
  const reconciled = {
    feature: [],
    improvement: [],
    bugfix: [],
    uncategorized: []
  };

  const currentIds = new Set(cards.map((c) => c.id));
  const assigned = new Set();

  // 1. Keep existing assignments for cards that are still selected
  if (draftCategories && typeof draftCategories === 'object') {
    for (const key of ['feature', 'improvement', 'bugfix', 'uncategorized']) {
      const ids = Array.isArray(draftCategories[key]) ? draftCategories[key] : [];
      for (const id of ids) {
        if (currentIds.has(id) && !assigned.has(id)) {
          reconciled[key].push(id);
          assigned.add(id);
        }
      }
    }
  }

  // 2. Add any newly selected cards based on categorize(card)
  for (const card of cards) {
    if (!assigned.has(card.id)) {
      const catObj = categorize(card);
      const catId = catObj && catObj.id ? catObj.id : 'uncategorized';
      const targetKey = reconciled[catId] ? catId : 'uncategorized';
      reconciled[targetKey].push(card.id);
      assigned.add(card.id);
    }
  }

  return reconciled;
}

/**
 * Finds which category currently holds a card ID.
 */
function findCategoryOfCard(cardId) {
  for (const cat of CATEGORIES) {
    if (categoriesState[cat.id] && categoriesState[cat.id].includes(cardId)) {
      return cat;
    }
  }
  return CATEGORIES.find((c) => c.id === 'uncategorized');
}

/**
 * Saves current draft to storage:
 * Writes release and categories, and DELETES selectedCardIds.
 */
async function saveCurrentDraft() {
  if (!currentDraft) return;

  const titleVal = titleInput ? titleInput.value.trim() : '';
  const versionVal = versionInput ? versionInput.value.trim() : '';
  const dateVal = dateInput ? dateInput.value : '';

  const draftToSave = {
    listId: currentDraft.listId,
    listName: currentDraft.listName,
    filterId: currentDraft.filterId,
    release: {
      title: titleVal,
      version: versionVal,
      date: dateVal
    },
    categories: {
      feature: categoriesState.feature,
      improvement: categoriesState.improvement,
      bugfix: categoriesState.bugfix,
      uncategorized: categoriesState.uncategorized
    }
    // Note: selectedCardIds is intentionally deleted on save in Step 2 to maintain single copy of IDs
  };

  await saveDraft(t, draftToSave);
}

/**
 * Debounced autosave (400ms).
 */
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    try {
      await saveCurrentDraft();
    } catch (err) {
      // Non-blocking draft save failure
    }
  }, 400);
}

/**
 * Renders loading skeleton for category rows.
 */
function renderLoadingSkeleton() {
  categoriesContainer.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const row = document.createElement('div');
    row.className = 'category-card-row skeleton-row';
    row.style.minHeight = '58px';
    row.innerHTML = `
      <div class="skeleton-box" style="width: 34px; height: 34px; border-radius: 50%; margin: 12px 16px;"></div>
      <div class="skeleton-box skeleton-text" style="width: 140px; margin: 12px 0;"></div>
      <div class="skeleton-box skeleton-chip" style="margin: 12px 16px;"></div>
    `;
    categoriesContainer.appendChild(row);
  }
}

/**
 * Renders an empty or blocked state message (e.g. no cards selected).
 */
function renderEmptyOrErrorState(message, showRetry = false, retryAction = null) {
  wizardBodyMain.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'state-container';
  container.style.width = '100%';

  const text = document.createElement('p');
  text.className = 'state-message';
  text.textContent = message;
  container.appendChild(text);

  if (showRetry && typeof retryAction === 'function') {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn-retry';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', retryAction);
    container.appendChild(retryBtn);
  } else {
    // Back to Step 1 button
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn-primary';
    backBtn.textContent = 'Back to Card Selection';
    backBtn.addEventListener('click', () => {
      navigateTo('select-cards.html');
    });
    container.appendChild(backBtn);
  }

  wizardBodyMain.appendChild(container);
}

/**
 * Renders all category rows and their card chips.
 */
function renderCategoryRows() {
  categoriesContainer.innerHTML = '';

  // Update total cards count badge
  totalCardsCountBadge.textContent = `(${selectedCards.length})`;

  // Hide inline error if uncategorized is now empty
  if (categoriesState.uncategorized.length === 0 && categoryErrorContainer) {
    categoryErrorContainer.style.display = 'none';
    categoryErrorContainer.textContent = '';
  }

  // Categories to render:
  // Features, Improvements, Bug Fixes always shown;
  // Unassigned shown only when it has cards, placed last.
  const categoriesToRender = CATEGORIES.filter((category) => {
    if (category.id === 'uncategorized') {
      return categoriesState.uncategorized.length > 0;
    }
    return true;
  });

  categoriesToRender.forEach((category) => {
    const cardIds = categoriesState[category.id] || [];
    const isPickerOpen = activePickerCategoryId === category.id;

    const row = document.createElement('div');
    row.className = `category-card-row ${isPickerOpen ? 'category-card-row--active-picker' : ''}`;

    // Header container (Left + Right parts)
    const header = document.createElement('div');
    header.className = 'category-card-header';

    // --- Left Part ---
    const leftPart = document.createElement('div');
    leftPart.className = 'category-header-left';

    // Circle icon
    const iconCircle = document.createElement('div');
    iconCircle.className = 'category-icon-circle';
    iconCircle.style.backgroundColor = category.rowIcon.bg;
    iconCircle.style.color = category.rowIcon.fg;
    if (category.icon) {
      iconCircle.innerHTML = getIcon(category.icon, 18);
    } else {
      // Fallback mark for unassigned
      iconCircle.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    }

    // Label: "{pluralLabel} ({count})"
    const titleLabel = document.createElement('span');
    titleLabel.className = 'category-name-label';
    titleLabel.textContent = `${category.pluralLabel} (${cardIds.length})`;

    // Chevron down button to toggle inline picker
    const chevronBtn = document.createElement('button');
    chevronBtn.type = 'button';
    chevronBtn.className = 'btn-category-chevron';
    chevronBtn.setAttribute('aria-expanded', isPickerOpen ? 'true' : 'false');
    chevronBtn.setAttribute('aria-label', `Add cards to ${category.pluralLabel}`);
    chevronBtn.innerHTML = getIcon('chevronDown', 16);

    chevronBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activePickerCategoryId === category.id) {
        activePickerCategoryId = null;
        activeChevronButton = null;
      } else {
        activePickerCategoryId = category.id;
        activeChevronButton = chevronBtn;
      }
      renderCategoryRows();
    });

    leftPart.appendChild(iconCircle);
    leftPart.appendChild(titleLabel);
    leftPart.appendChild(chevronBtn);

    // --- Right Part (Chips Area) ---
    const rightPart = document.createElement('div');
    rightPart.className = 'category-header-right';

    if (cardIds.length === 0) {
      const emptySpan = document.createElement('span');
      emptySpan.className = 'category-empty-text';
      emptySpan.textContent = 'No cards yet';
      rightPart.appendChild(emptySpan);
    } else {
      cardIds.forEach((cardId) => {
        const card = cardMap.get(cardId);
        if (!card) return;

        const chip = document.createElement('div');
        chip.className = 'category-card-chip';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'category-card-chip-name';
        nameSpan.textContent = card.name; // Security: textContent
        nameSpan.title = card.name;
        chip.appendChild(nameSpan);

        // Remove button (only for non-uncategorized cards)
        if (category.id !== 'uncategorized') {
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'btn-chip-remove';
          removeBtn.setAttribute('aria-label', `Remove ${card.name} from ${category.pluralLabel}`);
          removeBtn.innerHTML = getIcon('close', 12);

          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Move card to uncategorized (Unassigned)
            categoriesState[category.id] = categoriesState[category.id].filter((id) => id !== card.id);
            if (!categoriesState.uncategorized.includes(card.id)) {
              categoriesState.uncategorized.push(card.id);
            }

            announce(`Removed ${card.name} from ${category.pluralLabel}, now unassigned`);
            renderCategoryRows();
            scheduleAutosave();
          });

          chip.appendChild(removeBtn);
        }

        rightPart.appendChild(chip);
      });
    }

    header.appendChild(leftPart);
    header.appendChild(rightPart);
    row.appendChild(header);

    // --- Inline Card Picker Panel ---
    if (isPickerOpen) {
      const pickerPanel = document.createElement('div');
      pickerPanel.className = 'category-picker-panel';
      pickerPanel.setAttribute('role', 'region');
      pickerPanel.setAttribute('aria-label', `Add cards to ${category.pluralLabel}`);

      const pickerHeader = document.createElement('div');
      pickerHeader.className = 'category-picker-header';
      pickerHeader.textContent = `Select card to move to ${category.pluralLabel}:`;
      pickerPanel.appendChild(pickerHeader);

      // Find all cards NOT in this category
      const availableCards = selectedCards.filter((card) => !cardIds.includes(card.id));

      if (availableCards.length === 0) {
        const noCardsText = document.createElement('div');
        noCardsText.className = 'picker-empty-text';
        noCardsText.textContent = 'No other cards to add.';
        pickerPanel.appendChild(noCardsText);
      } else {
        const optionsList = document.createElement('div');
        optionsList.className = 'picker-options-list';
        optionsList.setAttribute('role', 'list');

        availableCards.forEach((card) => {
          const currentCat = findCategoryOfCard(card.id);

          const optionBtn = document.createElement('button');
          optionBtn.type = 'button';
          optionBtn.className = 'picker-card-option';

          const cardNameSpan = document.createElement('span');
          cardNameSpan.className = 'picker-card-name';
          cardNameSpan.textContent = card.name; // Security: textContent
          cardNameSpan.title = card.name;

          const sourceCatSpan = document.createElement('span');
          sourceCatSpan.className = 'picker-card-source';
          sourceCatSpan.textContent = currentCat.pluralLabel; // Security: textContent

          optionBtn.appendChild(cardNameSpan);
          optionBtn.appendChild(sourceCatSpan);

          optionBtn.addEventListener('click', () => {
            // Remove from existing category
            for (const key of ['feature', 'improvement', 'bugfix', 'uncategorized']) {
              categoriesState[key] = categoriesState[key].filter((id) => id !== card.id);
            }
            // Add to target category
            categoriesState[category.id].push(card.id);

            activePickerCategoryId = null;
            announce(`Moved ${card.name} to ${category.pluralLabel}`);
            renderCategoryRows();
            scheduleAutosave();

            // Return focus to chevron button
            if (activeChevronButton && typeof activeChevronButton.focus === 'function') {
              activeChevronButton.focus();
            }
          });

          optionBtn.setAttribute('role', 'listitem');
          optionsList.appendChild(optionBtn);
        });

        pickerPanel.appendChild(optionsList);
      }

      row.appendChild(pickerPanel);
    }

    categoriesContainer.appendChild(row);
  });
}

/**
 * Validates the form inputs and category assignments.
 * Returns true if valid, false otherwise.
 */
function validateForm() {
  let isValid = true;

  // Clear previous errors
  titleError.textContent = '';
  titleInput.removeAttribute('aria-invalid');
  titleInput.removeAttribute('aria-describedby');

  dateError.textContent = '';
  datePickerTrigger.removeAttribute('aria-invalid');
  datePickerTrigger.removeAttribute('aria-describedby');

  if (categoryErrorContainer) {
    categoryErrorContainer.style.display = 'none';
    categoryErrorContainer.textContent = '';
  }

  // 1. Release Title required
  const titleVal = titleInput.value.trim();
  if (!titleVal) {
    titleError.textContent = 'Release title is required';
    titleInput.setAttribute('aria-invalid', 'true');
    titleInput.setAttribute('aria-describedby', 'title-error');
    titleInput.focus();
    return false;
  }

  // 2. Release Date required and valid
  const dateVal = dateInput.value;
  if (!dateVal) {
    dateError.textContent = 'Release date is required';
    datePickerTrigger.setAttribute('aria-invalid', 'true');
    datePickerTrigger.setAttribute('aria-describedby', 'date-error');
    dateInput.focus();
    return false;
  }

  // 3. All cards must be assigned (Unassigned must have 0 cards)
  if (categoriesState.uncategorized && categoriesState.uncategorized.length > 0) {
    if (categoryErrorContainer) {
      categoryErrorContainer.textContent = 'Assign every card to a category to continue.';
      categoryErrorContainer.style.display = 'block';
      categoryErrorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    announce('Assign every card to a category to continue.');
    isValid = false;
  }

  // 4. Must have at least one card assigned
  const totalAssigned = (categoriesState.feature?.length || 0) +
                        (categoriesState.improvement?.length || 0) +
                        (categoriesState.bugfix?.length || 0);
  if (totalAssigned === 0 && isValid) {
    if (categoryErrorContainer) {
      categoryErrorContainer.textContent = 'Please assign at least one card to Features, Improvements, or Bug Fixes.';
      categoryErrorContainer.style.display = 'block';
      categoryErrorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    announce('Please assign at least one card to Features, Improvements, or Bug Fixes.');
    isValid = false;
  }

  return isValid;
}

/**
 * Synchronizes the date input value to the display text.
 */
function updateDateDisplay(val) {
  if (val) {
    dateDisplayText.textContent = formatLocalDate(val);
    dateError.textContent = '';
    datePickerTrigger.removeAttribute('aria-invalid');
  } else {
    dateDisplayText.textContent = 'Select date';
  }
}

/**
 * Initializes Step 2:
 * Loads draft, reconciles cards, binds events, and renders UI.
 */
async function init() {
  // 1. Render Header and Stepper
  renderHeader(headerRoot);
  renderStepper(stepperRoot, 1); // Step 2 (Categorize) is active

  // 2. Load draft from storage
  renderLoadingSkeleton();

  try {
    let draft = await loadDraft(t);

    // Fallback for standalone preview outside Trello if no draft exists yet
    if (!draft || (!draft.listId && !draft.selectedCardIds && !draft.categories)) {
      if (!t) {
        draft = {
          listId: 'list-done',
          listName: 'Done',
          filterId: 'all',
          selectedCardIds: ['card-done-1', 'card-done-4', 'card-done-2', 'card-done-3'],
          release: {
            title: 'Product Update',
            version: 'v2.3.0',
            date: getTodayLocalDate()
          },
          categories: {
            feature: ['card-done-1', 'card-done-4'],
            improvement: ['card-done-2'],
            bugfix: ['card-done-3'],
            uncategorized: []
          }
        };
      } else {
        renderEmptyOrErrorState('Select cards first to continue.');
        return;
      }
    }

    currentDraft = draft;

    // Determine selected card IDs: draft.selectedCardIds ?? union of categories
    let initialSelectedIds = Array.isArray(draft.selectedCardIds) && draft.selectedCardIds.length > 0
      ? draft.selectedCardIds
      : getUnionOfCategories(draft.categories);

    if (!initialSelectedIds || initialSelectedIds.length === 0) {
      if (!t) {
        initialSelectedIds = ['card-done-1', 'card-done-4', 'card-done-2', 'card-done-3'];
      } else {
        renderEmptyOrErrorState('Select cards first to continue.');
        return;
      }
    }

    // 3. Fetch selected cards (from session cache, list, or board)
    selectedCards = await getCardsByIds(t, initialSelectedIds, draft.listId);
    cardMap = new Map(selectedCards.map((c) => [c.id, c]));

    // Resilience: ensure any selected card IDs that couldn't be fetched have safe fallback representations
    for (const id of initialSelectedIds) {
      if (!cardMap.has(id)) {
        const placeholder = {
          id,
          name: 'Selected Card (' + (id.length > 6 ? id.slice(-6) : id) + ')',
          labels: []
        };
        selectedCards.push(placeholder);
        cardMap.set(id, placeholder);
      }
    }

    if (selectedCards.length === 0) {
      renderEmptyOrErrorState('Select cards first to continue.');
      return;
    }

    // 4. Reconcile categories
    categoriesState = reconcileCategories(selectedCards, draft.categories);

    // 5. Populate Release Details
    // Default value "Product Update" when draft has none
    // // TODO optionally derive a default from the board name
    titleInput.value = (draft.release && draft.release.title) ? draft.release.title : 'Product Update';
    versionInput.value = (draft.release && draft.release.version) ? draft.release.version : '';

    const initialDate = (draft.release && draft.release.date) ? draft.release.date : getTodayLocalDate();
    dateInput.value = initialDate;
    updateDateDisplay(initialDate);

    // 6. Render Categories Stack
    renderCategoryRows();

    // Attach form input listeners for debounced autosave
    titleInput.addEventListener('input', () => {
      if (titleInput.value.trim()) {
        titleError.textContent = '';
        titleInput.removeAttribute('aria-invalid');
      }
      scheduleAutosave();
    });

    versionInput.addEventListener('input', () => {
      scheduleAutosave();
    });

    dateInput.addEventListener('change', () => {
      updateDateDisplay(dateInput.value);
      if (!dateInput.value) {
        dateError.textContent = 'Release date is required';
        datePickerTrigger.setAttribute('aria-invalid', 'true');
      }
      scheduleAutosave();
    });

    // Native date picker trigger
    const openDatePicker = () => {
      try {
        if (typeof dateInput.showPicker === 'function') {
          dateInput.showPicker();
        } else {
          dateInput.focus();
        }
      } catch {
        dateInput.focus();
      }
    };

    datePickerTrigger.addEventListener('click', openDatePicker);
    datePickerTrigger.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        openDatePicker();
      }
    });

  } catch (error) {
    renderEmptyOrErrorState('Failed to load cards. Please try again.', true, () => init());
    return;
  }

  // 7. Global click / Escape listeners for inline picker dismissal
  document.addEventListener('click', (e) => {
    if (activePickerCategoryId !== null) {
      const isInsidePicker = e.target.closest('.category-picker-panel');
      const isInsideChevron = e.target.closest('.btn-category-chevron');
      if (!isInsidePicker && !isInsideChevron) {
        activePickerCategoryId = null;
        renderCategoryRows();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activePickerCategoryId !== null) {
      activePickerCategoryId = null;
      renderCategoryRows();
      if (activeChevronButton && typeof activeChevronButton.focus === 'function') {
        activeChevronButton.focus();
      }
    }
  });
}

// Kick off initialization on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
