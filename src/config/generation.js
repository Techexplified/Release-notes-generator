/**
 * Configuration for Release Notes generation layout.
 *
 * 'nested': The card is one <li> containing the card text (rewritten per template: pastTense or verbatim),
 *           optional card link and description, followed by a nested <ul class="sub-items"> with one <li> per item.
 * 'flat':   The card's checklist items become the card's own bullets (one <li> each) and the card title is omitted;
 *           the card link (if include.links) and description (if include.descriptions) attach to the card's LAST bullet.
 *
 * Fallback in both modes: If the card has no checklist items after filtering (no checklist, empty checklist,
 * or completedOnly removed everything), renders a single <li> from the card title.
 */
export const CHECKLIST_LAYOUT = 'nested'; // 'nested' | 'flat'
