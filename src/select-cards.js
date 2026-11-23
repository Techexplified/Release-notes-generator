import { APP_KEY, APP_NAME, APP_AUTHOR } from './config.js';
import { renderHeader } from './components/header.js';
import { renderStepper } from './components/stepper.js';
import { FILTERS, DEFAULT_FILTER_ID } from './config/filters.js';
import { categorize, getCategoryById } from './config/categories.js';
import { getLists, getCardsForList } from './data/data-source.js';
import { loadDraft, saveDraft } from './state/draft.js';

// Initialize Trello iframe client
let t = null;
try {
  if (typeof window !== 'undefined' && window.TrelloPowerUp) {
    t = window.TrelloPowerUp.iframe({
      appKey: APP_KEY,
      appName: APP_NAME,
      appAuthor: APP_AUTHOR
    });
  }
} catch {
  // fallback mode outside Trello modal context
}

// State
let availableLists = [];
let selectedListId = '';
let selectedFilterId = DEFAULT_FILTER_ID;
let currentListCards = [];
let selectedCardIds = new Set();
let isLoading = false;
let storedDraft = null;

// DOM Elements
const headerRoot = document.getElementById('header-root');
const stepperRoot = document.getElementById('stepper-root');
const listSelect = document.getElementById('list-select');
const filterSelect = document.getElementById('filter-select');
const cardListBox = document.getElementById('card-list-box');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const selectedCountBadge = document.getElementById('selected-count-badge');
const btnNext = document.getElementById('btn-next');

/**
 * Filters cards based on completion date.
 * // TODO: real definition of completion, see data-source.js
 */
function getFilteredCards(cards, filterId) {
  const filter = FILTERS.find((f) => f.id === filterId);
  if (!filter || filter.days === null) {
    return cards;
  }

  const cutoff = Date.now() - filter.days * 24 * 60 * 60 * 1000;
  return cards.filter((card) => {
    const timeStr = card.completedAt || (card.dueComplete && card.due) || card.dateLastActivity || card.due;
    if (!timeStr) return true;
    const completedTime = new Date(timeStr).getTime();
    return isNaN(completedTime) || completedTime >= cutoff;
  });
}

/**
 * Updates the Select All checkbox and counter badge based on displayed cards.
 */
function updateSelectionControls(displayedCards) {
  const displayedCount = displayedCards.length;
  const selectedCount = displayedCards.filter((card) => selectedCardIds.has(card.id)).length;

  // Selected count badge (aria-live polite)
  selectedCountBadge.textContent = `(${selectedCount} selected)`;

  // Select all checkbox state
  if (displayedCount === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    selectAllCheckbox.disabled = true;
  } else if (selectedCount === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    selectAllCheckbox.disabled = false;
  } else if (selectedCount === displayedCount) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
    selectAllCheckbox.disabled = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
    selectAllCheckbox.disabled = false;
  }

  // Next button state: disabled when 0 cards selected
  if (selectedCount > 0) {
    btnNext.disabled = false;
    btnNext.removeAttribute('aria-disabled');
    btnNext.removeAttribute('title');
  } else {
    btnNext.disabled = true;
    btnNext.setAttribute('aria-disabled', 'true');
    btnNext.title = 'Select at least one card';
  }
}

/**
 * Renders skeleton rows during loading.
 */
function renderLoadingState() {
  cardListBox.innerHTML = '';
  listSelect.disabled = true;
  filterSelect.disabled = true;
  selectAllCheckbox.disabled = true;
  btnNext.disabled = true;
  btnNext.setAttribute('aria-disabled', 'true');

  for (let i = 0; i < 5; i++) {
    const row = document.createElement('div');
    row.className = 'skeleton-row';
    row.innerHTML = `
      <div class="skeleton-box skeleton-checkbox"></div>
      <div class="skeleton-box skeleton-text"></div>
      <div class="skeleton-box skeleton-chip"></div>
      <div class="skeleton-box skeleton-btn"></div>
    `;
    cardListBox.appendChild(row);
  }
}

/**
 * Renders an empty or error state into the card list box.
 */
function renderStateMessage(message, showRetry = false) {
  cardListBox.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'state-container';

  const text = document.createElement('p');
  text.className = 'state-message';
  text.textContent = message;
  container.appendChild(text);

  if (showRetry) {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn-retry';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => loadCardsForSelectedList());
    container.appendChild(retryBtn);
  }

  cardListBox.appendChild(container);
}

/**
 * Renders the list of filtered cards into the card box.
 */
function renderCardList() {
  listSelect.disabled = false;
  filterSelect.disabled = false;

  const displayedCards = getFilteredCards(currentListCards, selectedFilterId);

  updateSelectionControls(displayedCards);

  if (currentListCards.length === 0) {
    renderStateMessage('This list has no cards yet.');
    return;
  }

  if (displayedCards.length === 0) {
    renderStateMessage('No cards match this filter. Try a longer date range.');
    return;
  }

  cardListBox.innerHTML = '';

  displayedCards.forEach((card) => {
    const isSelected = selectedCardIds.has(card.id);

    const row = document.createElement('div');
    row.className = `card-item-row ${isSelected ? 'is-selected' : ''}`;
    row.setAttribute('role', 'checkbox');
    row.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    row.tabIndex = 0;

    // Checkbox container
    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.className = 'checkbox-container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'native-checkbox card-checkbox';
    checkbox.checked = isSelected;
    checkbox.setAttribute('aria-label', `Select ${card.name}`);
    checkboxWrapper.appendChild(checkbox);

    // Card Name (single line with ellipsis and title attribute)
    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'card-name-wrapper';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'card-name';
    nameSpan.textContent = card.name; // Render with textContent for security
    nameSpan.title = card.name;
    nameWrapper.appendChild(nameSpan);

    // Category Chip
    const catResult = categorize(card);
    const category = typeof catResult === 'string' ? getCategoryById(catResult) : catResult;

    const chip = document.createElement('span');
    chip.className = 'category-chip';
    chip.textContent = category.label; // Render with textContent
    chip.style.backgroundColor = category.chip.bg;
    chip.style.color = category.chip.fg;
    chip.style.border = `1px solid ${category.chip.border || 'transparent'}`;

    // Card details icon button
    // // TODO: confirm intent: drag handle vs open card
    const detailsBtn = document.createElement('button');
    detailsBtn.type = 'button';
    detailsBtn.className = 'btn-card-details';
    detailsBtn.setAttribute('aria-label', 'Card details');
    detailsBtn.textContent = '≡';
    detailsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Details button does nothing yet; placeholder for future card details modal/action
    });

    // Assemble row
    row.appendChild(checkboxWrapper);
    row.appendChild(nameWrapper);
    row.appendChild(chip);
    row.appendChild(detailsBtn);

    // Toggle selection handler
    const toggleRow = () => {
      const currentlySelected = selectedCardIds.has(card.id);
      if (currentlySelected) {
        selectedCardIds.delete(card.id);
        row.classList.remove('is-selected');
        checkbox.checked = false;
        row.setAttribute('aria-checked', 'false');
      } else {
        selectedCardIds.add(card.id);
        row.classList.add('is-selected');
        checkbox.checked = true;
        row.setAttribute('aria-checked', 'true');
      }
      updateSelectionControls(displayedCards);
    };

    row.addEventListener('click', toggleRow);

    // Checkbox direct change handler
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRow();
    });

    // Keyboard accessibility: space or enter toggles row
    row.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleRow();
      }
    });

    cardListBox.appendChild(row);
  });

  // Note: For this modal (fixed height 640), do NOT call t.sizeTo.
}

/**
 * Loads cards for the currently selected list.
 */
async function loadCardsForSelectedList(preserveSelections = false) {
  if (!selectedListId) return;

  isLoading = true;
  renderLoadingState();

  try {
    const cards = await getCardsForList(t, selectedListId);
    currentListCards = cards;

    if (!preserveSelections) {
      selectedCardIds.clear();
    } else {
      // Retain only selections that exist in the loaded cards
      const validIds = new Set(cards.map((c) => c.id));
      selectedCardIds = new Set([...selectedCardIds].filter((id) => validIds.has(id)));
    }

    renderCardList();
  } catch {
    renderStateMessage('Failed to load cards. Please try again.', true);
  } finally {
    isLoading = false;
  }
}

/**
 * Initializes the page: loads draft, renders components, fetches lists and cards.
 */
async function init() {
  // 1. Render Header and Stepper
  renderHeader(headerRoot);
  renderStepper(stepperRoot, 0);

  // 2. Populate Filters dropdown from config
  filterSelect.innerHTML = '';
  FILTERS.forEach((filter) => {
    const option = document.createElement('option');
    option.value = filter.id;
    option.textContent = filter.label;
    if (filter.id === DEFAULT_FILTER_ID) {
      option.selected = true;
    }
    filterSelect.appendChild(option);
  });

  // 3. Load Draft and Lists in parallel
  renderLoadingState();

  try {
    const [draft, lists] = await Promise.all([
      loadDraft(t),
      getLists(t)
    ]);

    availableLists = lists;

    // Populate List dropdown
    listSelect.innerHTML = '';
    availableLists.forEach((list) => {
      const option = document.createElement('option');
      option.value = list.id;
      const countLabel = list.cardCount === 1 ? '1 card' : `${list.cardCount} cards`;
      option.textContent = `${list.name} (${countLabel})`;
      listSelect.appendChild(option);
    });

    storedDraft = draft;

    if (availableLists.length === 0) {
      renderStateMessage('No lists found on this board.');
      return;
    }

    // Determine initial list, filter, and selections
    if (draft && draft.listId && availableLists.some((l) => l.id === draft.listId)) {
      selectedListId = draft.listId;
      listSelect.value = selectedListId;

      if (draft.filterId && FILTERS.some((f) => f.id === draft.filterId)) {
        selectedFilterId = draft.filterId;
        filterSelect.value = selectedFilterId;
      }

      // Restore selection: from selectedCardIds if present, otherwise from union of all categories
      if (Array.isArray(draft.selectedCardIds)) {
        selectedCardIds = new Set(draft.selectedCardIds);
      } else if (draft.categories && typeof draft.categories === 'object') {
        const union = [];
        Object.values(draft.categories).forEach((ids) => {
          if (Array.isArray(ids)) union.push(...ids);
        });
        selectedCardIds = new Set(union);
      }

      await loadCardsForSelectedList(true);
    } else {
      // Default to first list and default filter
      selectedListId = availableLists[0].id;
      listSelect.value = selectedListId;
      selectedFilterId = DEFAULT_FILTER_ID;
      filterSelect.value = selectedFilterId;
      selectedCardIds.clear();

      await loadCardsForSelectedList(false);
    }
  } catch {
    renderStateMessage('Failed to initialize board data. Please try again.', true);
  }

  // 4. Attach Event Listeners

  // List change resets selection and reloads cards
  listSelect.addEventListener('change', (e) => {
    selectedListId = e.target.value;
    selectedCardIds.clear();
    loadCardsForSelectedList(false);
  });

  // Filter change keeps selections only for cards that are still displayed
  filterSelect.addEventListener('change', (e) => {
    selectedFilterId = e.target.value;
    const displayed = getFilteredCards(currentListCards, selectedFilterId);
    const displayedIds = new Set(displayed.map((c) => c.id));
    selectedCardIds = new Set([...selectedCardIds].filter((id) => displayedIds.has(id)));
    renderCardList();
  });

  // Select All checkbox toggles all displayed cards
  selectAllCheckbox.addEventListener('change', (e) => {
    const displayed = getFilteredCards(currentListCards, selectedFilterId);
    if (e.target.checked) {
      displayed.forEach((card) => selectedCardIds.add(card.id));
    } else {
      displayed.forEach((card) => selectedCardIds.delete(card.id));
    }
    renderCardList();
  });

  // Next button: saves draft and navigates to step 2 (categorize.html)
  btnNext.addEventListener('click', async () => {
    if (selectedCardIds.size === 0) return;

    btnNext.disabled = true;
    const currentList = availableLists.find((l) => l.id === selectedListId);

    // If list changed compared to stored draft, delete categories (keep release)
    const listChanged = storedDraft && storedDraft.listId && storedDraft.listId !== selectedListId;

    const draft = {
      listId: selectedListId,
      listName: currentList ? currentList.name : '',
      filterId: selectedFilterId,
      selectedCardIds: Array.from(selectedCardIds),
      release: storedDraft?.release,
      categories: listChanged ? undefined : storedDraft?.categories
    };

    // Cache the selected card objects and current list cards in sessionStorage
    try {
      const selectedCardsList = currentListCards.filter((card) => selectedCardIds.has(card.id));
      sessionStorage.setItem('selectedCardsCache', JSON.stringify(selectedCardsList));
      sessionStorage.setItem('boardCardsCache', JSON.stringify(currentListCards));
    } catch {
      // ignore
    }

    try {
      await Promise.race([
        saveDraft(t, draft),
        new Promise((resolve) => setTimeout(resolve, 300))
      ]);
    } catch {
      // ignore
    }

    // Navigate to step 2 (categorize.html) inside the same iframe
    window.location.href = 'categorize.html';
  });
}

// Kick off initialization on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

