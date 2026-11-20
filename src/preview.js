import { APP_KEY, APP_NAME, APP_AUTHOR } from './config.js';
import { renderHeader } from './components/header.js';
import { renderStepper } from './components/stepper.js';
import { TEMPLATES, DEFAULT_TEMPLATE_ID, getTemplateById } from './config/templates.js';
import { getCardsForList, getCardsByIds } from './data/data-source.js';
import { loadDraft, saveDraft } from './state/draft.js';
import { loadDoc, saveDoc } from './state/doc-store.js';
import { generateNotes } from './lib/notes-generator.js';
import { sanitizeHtml } from './lib/sanitize.js';
import { createTabs } from './components/tabs.js';
import { createEditorToolbar } from './components/editor-toolbar.js';
import { confirmDialog } from './components/confirm-dialog.js';

/**
 * CONTRACT FOR STEP 4 (Export):
 * Step 4 will read:
 * - loadDoc(t): { html: string, templateId: string, include: Object, signature: string }
 * - loadDraft(t): { release: { title, version, date }, categories: { ... } }
 * Step 4 will offer export options: Copy to Clipboard, Markdown, HTML, and Plain Text.
 * HTML export can inline the template CSS; Markdown and Plain Text cannot carry fonts. // TODO.
 */

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
} catch (error) {
  console.warn('TrelloPowerUp.iframe not available outside Trello modal context; using fallback mode', error);
}

// Config array for Include checkboxes
const INCLUDE_CONFIG = [
  { id: 'descriptions', label: 'Card descriptions' },
  { id: 'links', label: 'Card links' },
  { id: 'date', label: 'Release date' },
  { id: 'version', label: 'Version' },
  { id: 'completedOnly', label: 'Only completed checklist items', default: false }
];

// State
let currentDraft = null;
let currentCards = [];
let currentTemplateId = DEFAULT_TEMPLATE_ID;
let currentInclude = {
  descriptions: true,
  links: true,
  date: true,
  version: true,
  completedOnly: false
};
let baselineHtml = '';
let currentSignature = '';
let activeTab = 'edit';
let autosaveTimer = null;
let toolbarController = null;

// DOM Elements
const headerRoot = document.getElementById('header-root');
const stepperRoot = document.getElementById('stepper-root');
const wizardBodyMain = document.getElementById('wizard-body-main');
const templateSelect = document.getElementById('template-select');
const templateDescText = document.getElementById('template-desc-text');
const includeOptionsContainer = document.getElementById('include-options-container');
const tabsRoot = document.getElementById('tabs-root');
const toolbarRoot = document.getElementById('toolbar-root');
const panelEdit = document.getElementById('panel-edit');
const panelPreview = document.getElementById('panel-preview');
const editorSurface = document.getElementById('editor-surface');
const previewSurface = document.getElementById('preview-surface');
const btnBack = document.getElementById('btn-back');
const btnNext = document.getElementById('btn-next');
const srAnnouncements = document.getElementById('sr-announcements');

// Back button handler (registered immediately so Back works at all times, including prerequisite error states)
if (btnBack) {
  btnBack.addEventListener('click', async () => {
    btnBack.disabled = true;
    try {
      await Promise.race([
        saveAllState(),
        new Promise((resolve) => setTimeout(resolve, 250))
      ]);
    } catch (err) {
      console.warn('Failed to save state on Back:', err);
    }
    window.location.href = 'categorize.html';
  });
}

/**
 * Computes a deterministic signature string for release details and categories.
 */
function computeSignature(release, categories) {
  const payload = {
    release: release || {},
    categories: {
      feature: categories?.feature || [],
      improvement: categories?.improvement || [],
      bugfix: categories?.bugfix || [],
      uncategorized: categories?.uncategorized || []
    }
  };
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * Announces message to screen readers.
 */
function announce(message) {
  if (srAnnouncements) {
    srAnnouncements.textContent = '';
    setTimeout(() => {
      srAnnouncements.textContent = message;
    }, 50);
  }
}

/**
 * Returns true if editor has been edited since last generation/baseline.
 */
function isEditorDirty() {
  return editorSurface.innerHTML !== baselineHtml;
}

/**
 * Updates the disabled/enabled state of the Next: Export button.
 */
function updateNextButtonState() {
  const text = editorSurface.textContent.trim();
  if (!text) {
    btnNext.disabled = true;
    btnNext.setAttribute('aria-disabled', 'true');
    btnNext.title = 'Release notes are empty';
  } else {
    btnNext.disabled = false;
    btnNext.removeAttribute('aria-disabled');
    btnNext.title = 'Export release notes';
  }
}

/**
 * Synchronizes template CSS class on editor and preview containers.
 */
function applyTemplateClass(template) {
  TEMPLATES.forEach((tpl) => {
    editorSurface.classList.remove(tpl.cssClass);
    previewSurface.classList.remove(tpl.cssClass);
  });
  editorSurface.classList.add(template.cssClass);
  previewSurface.classList.add(template.cssClass);
}

/**
 * Generates notes from current state, sets into editor, and establishes new baseline.
 */
function generateAndSetNotes() {
  const template = getTemplateById(currentTemplateId);
  applyTemplateClass(template);

  const fragment = generateNotes({
    template,
    release: currentDraft.release,
    categories: currentDraft.categories,
    cards: currentCards,
    include: currentInclude
  });

  editorSurface.innerHTML = '';
  editorSurface.appendChild(fragment);
  baselineHtml = editorSurface.innerHTML;

  if (activeTab === 'preview') {
    previewSurface.innerHTML = sanitizeHtml(editorSurface.innerHTML);
  }

  updateNextButtonState();
  if (toolbarController) {
    toolbarController.updateState();
  }
}

/**
 * Saves draft configuration and edited document.
 */
async function saveAllState() {
  if (!currentDraft) return;

  const currentHtml = editorSurface.innerHTML;

  // 1. Save draft configuration (small payload via t.set)
  const draftUpdates = {
    preview: {
      templateId: currentTemplateId,
      include: currentInclude
    }
  };

  try {
    await saveDraft(t, draftUpdates);
  } catch (err) {
    console.warn('Failed to save draft preview settings:', err);
  }

  // 2. Save full rendered document to doc-store (sessionStorage / memory)
  const docData = {
    html: currentHtml,
    signature: currentSignature,
    templateId: currentTemplateId,
    include: currentInclude,
    baseline: baselineHtml
  };

  try {
    saveDoc(t, docData);
  } catch (err) {
    console.warn('Failed to save document store:', err);
  }
}

/**
 * Debounced autosave (500ms).
 */
function triggerAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveAllState();
  }, 500);
}

/**
 * Renders an empty or error state when prerequisites are not met.
 */
function renderPrerequisiteError(message, showRetry = false, onRetry = null) {
  wizardBodyMain.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'state-container';
  container.style.width = '100%';

  const text = document.createElement('p');
  text.className = 'state-message';
  text.textContent = message;
  container.appendChild(text);

  if (showRetry && typeof onRetry === 'function') {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn-retry';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', onRetry);
    container.appendChild(retryBtn);
  } else {
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn-primary';
    backBtn.textContent = 'Back to Categorize';
    backBtn.addEventListener('click', () => {
      window.location.href = 'categorize.html';
    });
    container.appendChild(backBtn);
  }

  wizardBodyMain.appendChild(container);
}

/**
 * Populates template dropdown and info box.
 */
function renderTemplateSelector() {
  templateSelect.innerHTML = '';
  TEMPLATES.forEach((tpl) => {
    const option = document.createElement('option');
    option.value = tpl.id;
    option.textContent = tpl.name;
    if (tpl.id === currentTemplateId) {
      option.selected = true;
    }
    templateSelect.appendChild(option);
  });

  const selectedTpl = getTemplateById(currentTemplateId);
  templateDescText.textContent = selectedTpl.description;

  templateSelect.addEventListener('change', async (e) => {
    const newTemplateId = e.target.value;
    if (newTemplateId === currentTemplateId) return;

    if (isEditorDirty()) {
      const confirmed = await confirmDialog({
        title: 'Replace Edits?',
        message: 'Changing this will replace your edits. Continue?',
        confirmLabel: 'Replace',
        cancelLabel: 'Cancel',
        isDestructive: true
      });

      if (!confirmed) {
        templateSelect.value = currentTemplateId;
        return;
      }
    }

    currentTemplateId = newTemplateId;
    const tpl = getTemplateById(currentTemplateId);
    templateDescText.textContent = tpl.description;
    generateAndSetNotes();
    announce(`Template changed to ${tpl.name}`);
    triggerAutosave();
  });
}

/**
 * Populates include checkboxes.
 */
function renderIncludeOptions() {
  includeOptionsContainer.innerHTML = '';
  const hasVersion = Boolean(currentDraft.release?.version && currentDraft.release.version.trim());
  const hasChecklistItems = currentCards.some(
    (c) => Array.isArray(c.checklists) && c.checklists.some(
      (cl) => Array.isArray(cl.checkItems) && cl.checkItems.length > 0
    )
  );

  INCLUDE_CONFIG.forEach((opt) => {
    const row = document.createElement('label');
    row.className = 'checkbox-option-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'native-checkbox';
    checkbox.id = `include-${opt.id}`;

    if (opt.id === 'version' && !hasVersion) {
      checkbox.checked = false;
      checkbox.disabled = true;
      row.classList.add('is-disabled');
      row.title = 'No version set';
      currentInclude.version = false;
    } else if (opt.id === 'completedOnly' && !hasChecklistItems) {
      checkbox.checked = false;
      checkbox.disabled = true;
      row.classList.add('is-disabled');
      row.title = 'No checklist items on the selected cards';
      currentInclude.completedOnly = false;
    } else {
      if (opt.id === 'completedOnly') {
        checkbox.checked = Boolean(currentInclude.completedOnly);
      } else {
        checkbox.checked = currentInclude[opt.id] !== false;
      }
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'checkbox-option-label';
    labelSpan.textContent = opt.label;

    row.appendChild(checkbox);
    row.appendChild(labelSpan);
    includeOptionsContainer.appendChild(row);

    checkbox.addEventListener('change', async () => {
      const newValue = checkbox.checked;

      if (isEditorDirty()) {
        const confirmed = await confirmDialog({
          title: 'Replace Edits?',
          message: 'Changing this will replace your edits. Continue?',
          confirmLabel: 'Replace',
          cancelLabel: 'Cancel',
          isDestructive: true
        });

        if (!confirmed) {
          checkbox.checked = !newValue;
          return;
        }
      }

      currentInclude[opt.id] = newValue;
      generateAndSetNotes();
      announce('Notes regenerated');
      triggerAutosave();
    });
  });
}

/**
 * Initializes Step 3.
 */
async function init() {
  renderHeader(headerRoot);
  renderStepper(stepperRoot, 2); // Step 3 (Preview & Edit) is active

  try {
    const draft = await loadDraft(t);
    currentDraft = draft;

    // Validation: must have draft, listId, and assigned categories
    if (!draft || !draft.listId || !draft.categories) {
      renderPrerequisiteError('Finish the previous steps to continue.');
      return;
    }

    // Must not have cards in uncategorized
    const uncategorizedCards = draft.categories.uncategorized || [];
    if (uncategorizedCards.length > 0) {
      renderPrerequisiteError('Finish the previous steps to continue.');
      return;
    }

    // Must have at least one card in features, improvements, or bugfixes
    const totalAssignedIds = [
      ...(draft.categories.feature || []),
      ...(draft.categories.improvement || []),
      ...(draft.categories.bugfix || [])
    ];

    if (totalAssignedIds.length === 0) {
      renderPrerequisiteError('Finish the previous steps to continue.');
      return;
    }

    // Fetch card objects
    currentCards = await getCardsByIds(t, totalAssignedIds, draft.listId);

    if (currentCards.length === 0) {
      renderPrerequisiteError('Finish the previous steps to continue.');
      return;
    }

    // Compute signature of release and categories
    currentSignature = computeSignature(draft.release, draft.categories);

    // Read stored doc from doc-store
    const storedDoc = loadDoc(t);

    // Initial template & include from draft.preview or defaults
    if (draft.preview?.templateId) {
      currentTemplateId = draft.preview.templateId;
    } else if (storedDoc?.templateId) {
      currentTemplateId = storedDoc.templateId;
    }

    if (draft.preview?.include) {
      currentInclude = {
        descriptions: true,
        links: true,
        date: true,
        version: true,
        completedOnly: false,
        ...draft.preview.include
      };
    } else if (storedDoc?.include) {
      currentInclude = {
        descriptions: true,
        links: true,
        date: true,
        version: true,
        completedOnly: false,
        ...storedDoc.include
      };
    }

    const hasAnyChecklists = currentCards.some(
      (c) => Array.isArray(c.checklists) && c.checklists.some(
        (cl) => Array.isArray(cl.checkItems) && cl.checkItems.length > 0
      )
    );
    if (!hasAnyChecklists) {
      currentInclude.completedOnly = false;
    }

    // Initialize left sidebar options
    renderTemplateSelector();
    renderIncludeOptions();

    // Initialize formatting toolbar
    toolbarController = createEditorToolbar({
      container: toolbarRoot,
      editorEl: editorSurface,
      onChange: () => {
        updateNextButtonState();
        triggerAutosave();
      },
      onAnnounce: (msg) => announce(msg)
    });

    // Handle document restoration logic based on signature & dirty state
    const currentTpl = getTemplateById(currentTemplateId);
    applyTemplateClass(currentTpl);

    if (!storedDoc || !storedDoc.html) {
      // Case 1: No stored doc -> generate fresh
      generateAndSetNotes();
    } else if (storedDoc.signature === currentSignature) {
      // Case 2: Matching signature -> restore saved html and keep baseline
      editorSurface.innerHTML = sanitizeHtml(storedDoc.html);
      baselineHtml = storedDoc.baseline || editorSurface.innerHTML;
      updateNextButtonState();
    } else {
      // Case 3: Signature differs (earlier steps changed)
      const isDirty = storedDoc.html !== storedDoc.baseline;
      if (!isDirty) {
        // Not dirty -> regenerate silently
        generateAndSetNotes();
      } else {
        // Dirty -> confirm regeneration
        const confirmed = await confirmDialog({
          title: 'Regenerate Release Notes?',
          message: 'Your categories or release details changed. Regenerate the notes? Your edits will be replaced.',
          confirmLabel: 'Regenerate',
          cancelLabel: 'Keep my edits',
          isDestructive: true
        });

        if (confirmed) {
          generateAndSetNotes();
        } else {
          // Keep stored edits & update signature
          editorSurface.innerHTML = sanitizeHtml(storedDoc.html);
          baselineHtml = storedDoc.baseline || editorSurface.innerHTML;
          updateNextButtonState();
          saveAllState();
        }
      }
    }

    // Intercept Paste on editor surface: plain text only
    editorSurface.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      // // TODO note: document.execCommand('insertText') deprecated in specs but standard across browsers
      document.execCommand('insertText', false, text);
      updateNextButtonState();
      triggerAutosave();
    });

    // Content change listener
    editorSurface.addEventListener('input', () => {
      updateNextButtonState();
      triggerAutosave();
    });

    // Setup Tabs (Edit / Preview)
    createTabs({
      container: tabsRoot,
      tabs: [
        { id: 'edit', label: 'Edit' },
        { id: 'preview', label: 'Preview' }
      ],
      activeTabId: 'edit',
      onTabChange: (newTab) => {
        activeTab = newTab;
        if (newTab === 'edit') {
          panelEdit.style.display = 'block';
          toolbarRoot.style.display = 'flex';
          panelPreview.style.display = 'none';
          editorSurface.focus();
        } else {
          panelEdit.style.display = 'none';
          toolbarRoot.style.display = 'none';
          panelPreview.style.display = 'block';
          // Sanitize and render into preview
          previewSurface.innerHTML = sanitizeHtml(editorSurface.innerHTML);
        }
      }
    });

    // Footer Navigation
    btnNext.addEventListener('click', async () => {
      const text = editorSurface.textContent.trim();
      if (!text) {
        btnNext.disabled = true;
        btnNext.title = 'Release notes are empty';
        return;
      }
      await saveAllState();
      window.location.href = 'export.html';
    });

  } catch (error) {
    console.error('Failed to initialize Step 3:', error);
    renderPrerequisiteError('Failed to load release data. Please try again.', true, () => init());
  }
}

// Kick off initialization on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
