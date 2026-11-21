import { APP_KEY, APP_NAME, APP_AUTHOR } from './config.js';
import { renderHeader } from './components/header.js';
import { renderStepper } from './components/stepper.js';
import { getIcon } from './components/icons.js';
import { EXPORT_FORMATS, DEFAULT_FORMAT_ID, getFormatById } from './config/export-formats.js';
import { buildExport } from './lib/export/index.js';
import { downloadFile } from './lib/export/download.js';
import { copyText } from './lib/export/clipboard.js';
import { loadDoc } from './state/doc-store.js';
import { loadDraft, saveDraft } from './state/draft.js';
import { sanitizeHtml } from './lib/sanitize.js';

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

// State
let currentDoc = null;
let currentDraft = null;
let selectedFormatId = DEFAULT_FORMAT_ID;
let copyResetTimer = null;

// DOM Elements
const headerRoot = document.getElementById('header-root');
const stepperRoot = document.getElementById('stepper-root');
const exportBodyMain = document.getElementById('export-body-main');
const exportFooter = document.getElementById('export-footer');
const formatOptionsContainer = document.getElementById('format-options-container');
const exportPreviewContainer = document.getElementById('export-preview-container');
const exportStatusBanner = document.getElementById('export-status-banner');
const btnBack = document.getElementById('btn-back');
const btnCopy = document.getElementById('btn-copy');
const copyIconSlot = document.getElementById('copy-icon-slot');
const copyLabelText = document.getElementById('copy-label-text');
const btnDownload = document.getElementById('btn-download');
const downloadIconSlot = document.getElementById('download-icon-slot');
const downloadLabelText = document.getElementById('download-label-text');
const srAnnouncements = document.getElementById('sr-announcements');

// Back button handler (registered immediately so Back always works)
if (btnBack) {
  btnBack.addEventListener('click', () => {
    btnBack.disabled = true;
    window.location.href = 'preview.html';
  });
}

/**
 * Announces message to screen readers via aria-live region.
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
 * Displays a short inline status feedback message in the banner.
 */
function showStatusBanner(text, isError = false) {
  if (!exportStatusBanner) return;
  exportStatusBanner.textContent = text;
  exportStatusBanner.style.display = 'inline-flex';
  exportStatusBanner.style.color = isError ? '#be123c' : '#0c66e4';
  exportStatusBanner.style.backgroundColor = isError ? '#ffe4e6' : '#f0f7ff';
}

/**
 * Renders an empty or error state when prerequisites are missing.
 */
function renderPrerequisiteError(message) {
  exportBodyMain.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'state-container';
  container.style.width = '100%';

  const text = document.createElement('p');
  text.className = 'state-message';
  text.textContent = message;
  container.appendChild(text);

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn-primary';
  backBtn.textContent = 'Back to Preview & Edit';
  backBtn.addEventListener('click', () => {
    window.location.href = 'preview.html';
  });
  container.appendChild(backBtn);

  exportBodyMain.appendChild(container);

  // Hide footer export controls
  if (btnCopy) btnCopy.style.display = 'none';
  if (btnDownload) btnDownload.style.display = 'none';
}

/**
 * Renders the preview container according to the active format.
 */
function renderPreview() {
  if (!exportPreviewContainer || !currentDoc) return;
  exportPreviewContainer.innerHTML = '';

  const release = currentDraft?.release || {};
  const templateId = currentDoc.templateId || 'customer';

  let exportData;
  try {
    exportData = buildExport({
      format: selectedFormatId,
      html: currentDoc.html,
      templateId,
      release
    });
  } catch (err) {
    console.error('Failed to build export preview:', err);
    exportPreviewContainer.textContent = 'Failed to generate preview.';
    return;
  }

  if (selectedFormatId === 'txt') {
    // Plain text format: render in <pre>
    const pre = document.createElement('pre');
    pre.className = 'export-preview-pre';
    pre.textContent = exportData.content;
    exportPreviewContainer.appendChild(pre);
  } else {
    // Markdown and HTML formats: render sanitized document read-only inside tpl-{templateId} container
    const renderedDiv = document.createElement('div');
    renderedDiv.className = `export-preview-rendered tpl-${templateId}`;

    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(`<body>${sanitizeHtml(currentDoc.html)}</body>`, 'text/html');

    Array.from(parsedDoc.body.childNodes).forEach((node) => {
      renderedDiv.appendChild(node.cloneNode(true));
    });

    exportPreviewContainer.appendChild(renderedDiv);
  }

  // Scroll preview back to top on format change
  exportPreviewContainer.scrollTop = 0;
}

/**
 * Builds the radio card controls for all available export formats.
 */
function renderFormatOptions() {
  if (!formatOptionsContainer) return;
  formatOptionsContainer.innerHTML = '';

  EXPORT_FORMATS.forEach((format) => {
    const isSelected = format.id === selectedFormatId;

    const label = document.createElement('label');
    label.className = `format-card-label ${isSelected ? 'is-selected' : ''}`;
    label.setAttribute('for', `format-radio-${format.id}`);

    // Real hidden radio input for native keyboard support
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'export-format';
    radio.id = `format-radio-${format.id}`;
    radio.value = format.id;
    radio.className = 'sr-only';
    radio.checked = isSelected;

    radio.addEventListener('change', async () => {
      if (radio.checked) {
        selectedFormatId = format.id;

        // Update selected card styling
        formatOptionsContainer.querySelectorAll('.format-card-label').forEach((el) => {
          el.classList.remove('is-selected');
        });
        label.classList.add('is-selected');

        renderPreview();
        announce(`Selected ${format.label}`);

        // Persist choice to draft
        try {
          await saveDraft(t, { export: { format: selectedFormatId } });
        } catch (err) {
          console.warn('Failed to save export format preference:', err);
        }
      }
    });

    // Custom Radio Indicator
    const indicator = document.createElement('span');
    indicator.className = 'custom-radio-indicator';
    indicator.setAttribute('aria-hidden', 'true');

    const dot = document.createElement('span');
    dot.className = 'custom-radio-dot';
    indicator.appendChild(dot);

    // Format Icon
    const iconBox = document.createElement('span');
    iconBox.className = 'format-icon-box';
    iconBox.setAttribute('aria-hidden', 'true');
    iconBox.innerHTML = getIcon(format.icon, 22);

    // Text details
    const textDiv = document.createElement('span');
    textDiv.className = 'format-card-text';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'format-card-title';
    titleSpan.textContent = format.label;

    const descSpan = document.createElement('span');
    descSpan.className = 'format-card-desc';
    descSpan.textContent = format.description;

    textDiv.appendChild(titleSpan);
    textDiv.appendChild(descSpan);

    label.appendChild(radio);
    label.appendChild(indicator);
    label.appendChild(iconBox);
    label.appendChild(textDiv);

    formatOptionsContainer.appendChild(label);
  });
}

/**
 * Initializes button icons and events.
 */
function bindActionButtons() {
  if (copyIconSlot) {
    copyIconSlot.innerHTML = getIcon('copy', 16);
  }
  if (downloadIconSlot) {
    downloadIconSlot.innerHTML = getIcon('download', 16);
  }

  // Copy to Clipboard Button
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      if (!currentDoc) return;

      const formatDef = getFormatById(selectedFormatId);
      const release = currentDraft?.release || {};
      const templateId = currentDoc.templateId || 'customer';

      let exportData;
      try {
        exportData = buildExport({
          format: selectedFormatId,
          html: currentDoc.html,
          templateId,
          release
        });
      } catch (err) {
        console.error('Build export failed for copy:', err);
        showStatusBanner('Could not generate export content.', true);
        return;
      }

      const success = await copyText(exportData.content);

      if (success) {
        clearTimeout(copyResetTimer);
        copyIconSlot.innerHTML = getIcon('check', 16);
        copyLabelText.textContent = 'Copied';
        btnCopy.classList.add('btn-success');

        const message = `Copied ${formatDef.label}`;
        announce(message);
        showStatusBanner(message);

        copyResetTimer = setTimeout(() => {
          copyIconSlot.innerHTML = getIcon('copy', 16);
          copyLabelText.textContent = 'Copy to Clipboard';
          btnCopy.classList.remove('btn-success');
        }, 2000);
      } else {
        announce('Could not copy automatically. Use Download instead.');
        showStatusBanner('Could not copy automatically. Use Download instead.', true);
      }
    });
  }

  // Download Button
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!currentDoc) return;

      const release = currentDraft?.release || {};
      const templateId = currentDoc.templateId || 'customer';

      try {
        const exportData = buildExport({
          format: selectedFormatId,
          html: currentDoc.html,
          templateId,
          release
        });

        downloadFile({
          filename: exportData.filename,
          mime: exportData.mime,
          content: exportData.content,
          format: selectedFormatId
        });

        const statusMsg = `Download started: ${exportData.filename}`;
        announce(statusMsg);
        showStatusBanner(statusMsg);
      } catch (err) {
        console.error('Download execution failed:', err);
        announce('Download failed. Please try again.');
        showStatusBanner('Download failed. Please try again.', true);
      }
    });
  }
}

/**
 * Initializes Step 4 (Export):
 * Loads document and draft, verifies prerequisites, renders UI.
 */
async function init() {
  // 1. Render Header and Stepper
  renderHeader(headerRoot);
  renderStepper(stepperRoot, 3); // Step 4 (Export) is active

  // 2. Load stored document and draft
  let doc = loadDoc(t);
  let draft = await loadDraft(t);

  // Fallback for standalone dev preview outside Trello
  if (!doc || !doc.html || !doc.html.trim()) {
    if (!t) {
      draft = {
        release: {
          title: 'Product Update',
          version: 'v2.3.0',
          date: '2026-01-28'
        },
        export: {
          format: 'md'
        }
      };

      doc = {
        templateId: 'customer',
        html: `
          <h1 class="doc-title">📣 Product Update v2.3.0</h1>
          <p class="doc-meta">Released on Jan 28, 2026</p>
          <p>We’re excited to share the latest updates that make the app faster, smoother and more reliable.</p>
          <h2 class="band band-feature" data-category="feature"><span class="band-icon">✨ </span>New Features</h2>
          <ul>
            <li>
              Added dark mode to the app.
              <a class="card-link" href="https://trello.com/c/card-done-1" target="_blank" rel="noopener noreferrer">View card</a>
              <ul class="sub-items">
                <li>Theme toggle in settings</li>
                <li>Remembers your choice across sessions</li>
              </ul>
            </li>
            <li>Updated the user onboarding flow.</li>
          </ul>
          <h2 class="band band-improvement" data-category="improvement"><span class="band-icon">📈 </span>What’s Improved</h2>
          <ul>
            <li>Improved page load speed for a smoother experience.</li>
          </ul>
          <h2 class="band band-bugfix" data-category="bugfix"><span class="band-icon">🔧 </span>Bug Fixes</h2>
          <ul>
            <li>Fixed an issue that was causing login errors on mobile.</li>
          </ul>
        `
      };
    } else {
      renderPrerequisiteError('Nothing to export yet. Go back and generate your release notes.');
      return;
    }
  }

  currentDoc = doc;
  currentDraft = draft;

  // Restore preferred export format
  if (draft?.export?.format) {
    const valid = EXPORT_FORMATS.some((f) => f.id === draft.export.format);
    if (valid) {
      selectedFormatId = draft.export.format;
    }
  }

  // 3. Render format radio cards
  renderFormatOptions();

  // 4. Render initial preview
  renderPreview();

  // 5. Bind Action Buttons
  bindActionButtons();
}

// Kick off initialization on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
