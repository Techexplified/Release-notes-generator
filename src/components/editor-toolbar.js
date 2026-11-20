import { getIcon } from './icons.js';

/**
 * Creates the formatting toolbar for the release notes rich text editor.
 * Commands: Bold, Italic, | H2, H3, | Bullet List, Numbered List, | Link, Undo, Redo.
 * Includes anchored Link insertion popover.
 *
 * @param {Object} options
 * @param {HTMLElement} options.container - Container to render toolbar into
 * @param {HTMLElement} options.editorEl - The contenteditable editor element
 * @param {Function} options.onChange - Callback fired on document modification
 * @param {Function} options.onAnnounce - Accessibility announce callback
 */
export function createEditorToolbar({ container, editorEl, onChange, onAnnounce }) {
  if (!container || !editorEl) return;
  container.innerHTML = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Formatting');

  let activeLinkPopover = null;

  function exec(command, value = null) {
    editorEl.focus();
    // // TODO note: document.execCommand is deprecated in current specs but remains widely supported across browsers. Consider TipTap in future milestones.
    document.execCommand(command, false, value);
    if (typeof onChange === 'function') {
      onChange();
    }
    updateToolbarState();
  }

  function createButton({ label, title, iconName, textLabel, onClick }) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toolbar-btn';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', title);

    if (iconName) {
      btn.innerHTML = getIcon(iconName, 15);
    } else if (textLabel) {
      const span = document.createElement('span');
      span.className = 'toolbar-btn-text';
      span.textContent = textLabel;
      btn.appendChild(span);
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onClick(btn);
    });

    return btn;
  }

  function createDivider() {
    const div = document.createElement('span');
    div.className = 'toolbar-divider';
    div.setAttribute('aria-hidden', 'true');
    return div;
  }

  // Group 1: Bold, Italic
  const btnBold = createButton({
    label: 'Bold (Ctrl+B)',
    title: 'Bold (Ctrl+B)',
    iconName: 'bold',
    onClick: () => exec('bold')
  });

  const btnItalic = createButton({
    label: 'Italic (Ctrl+I)',
    title: 'Italic (Ctrl+I)',
    iconName: 'italic',
    onClick: () => exec('italic')
  });

  toolbar.appendChild(btnBold);
  toolbar.appendChild(btnItalic);
  toolbar.appendChild(createDivider());

  // Group 2: Headings H2, H3
  const btnH2 = createButton({
    label: 'Heading 2',
    title: 'Heading 2',
    textLabel: 'H2',
    onClick: () => {
      const currentBlock = getBlockTag();
      if (currentBlock === 'h2') {
        exec('formatBlock', '<p>');
      } else {
        exec('formatBlock', '<h2>');
      }
    }
  });

  const btnH3 = createButton({
    label: 'Heading 3',
    title: 'Heading 3',
    textLabel: 'H3',
    onClick: () => {
      const currentBlock = getBlockTag();
      if (currentBlock === 'h3') {
        exec('formatBlock', '<p>');
      } else {
        exec('formatBlock', '<h3>');
      }
    }
  });

  toolbar.appendChild(btnH2);
  toolbar.appendChild(btnH3);
  toolbar.appendChild(createDivider());

  // Group 3: Lists
  const btnBulletList = createButton({
    label: 'Bulleted list',
    title: 'Bulleted list',
    iconName: 'listBullet',
    onClick: () => exec('insertUnorderedList')
  });

  const btnNumberedList = createButton({
    label: 'Numbered list',
    title: 'Numbered list',
    iconName: 'listOrdered',
    onClick: () => exec('insertOrderedList')
  });

  toolbar.appendChild(btnBulletList);
  toolbar.appendChild(btnNumberedList);
  toolbar.appendChild(createDivider());

  // Group 4: Link
  const btnLink = createButton({
    label: 'Link (Ctrl+K)',
    title: 'Link (Ctrl+K)',
    iconName: 'link',
    onClick: (anchorBtn) => openLinkPopover(anchorBtn)
  });

  toolbar.appendChild(btnLink);

  // Group 5: Undo / Redo (Right aligned)
  const historyGroup = document.createElement('div');
  historyGroup.className = 'toolbar-group-right';

  const btnUndo = createButton({
    label: 'Undo (Ctrl+Z)',
    title: 'Undo (Ctrl+Z)',
    iconName: 'undo',
    onClick: () => exec('undo')
  });

  const btnRedo = createButton({
    label: 'Redo (Ctrl+Y)',
    title: 'Redo (Ctrl+Y)',
    iconName: 'redo',
    onClick: () => exec('redo')
  });

  historyGroup.appendChild(btnUndo);
  historyGroup.appendChild(btnRedo);
  toolbar.appendChild(historyGroup);

  // Helper to determine current heading or block tag
  function getBlockTag() {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return '';
    let node = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    while (node && node !== editorEl && node !== document.body) {
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (['h1', 'h2', 'h3', 'p', 'li'].includes(tag)) {
        return tag;
      }
      node = node.parentNode;
    }
    return '';
  }

  // Helper to find parent <a> element of selection
  function getSelectedLink() {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return null;
    let node = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== editorEl && node !== document.body) {
      if (node.tagName && node.tagName.toLowerCase() === 'a') {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  // Update active state of toolbar buttons
  function updateToolbarState() {
    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isBullet = document.queryCommandState('insertUnorderedList');
      const isOrdered = document.queryCommandState('insertOrderedList');
      const block = getBlockTag();
      const hasLink = getSelectedLink() !== null;

      btnBold.setAttribute('aria-pressed', isBold ? 'true' : 'false');
      btnBold.classList.toggle('is-active', isBold);

      btnItalic.setAttribute('aria-pressed', isItalic ? 'true' : 'false');
      btnItalic.classList.toggle('is-active', isItalic);

      btnH2.setAttribute('aria-pressed', block === 'h2' ? 'true' : 'false');
      btnH2.classList.toggle('is-active', block === 'h2');

      btnH3.setAttribute('aria-pressed', block === 'h3' ? 'true' : 'false');
      btnH3.classList.toggle('is-active', block === 'h3');

      btnBulletList.setAttribute('aria-pressed', isBullet ? 'true' : 'false');
      btnBulletList.classList.toggle('is-active', isBullet);

      btnNumberedList.setAttribute('aria-pressed', isOrdered ? 'true' : 'false');
      btnNumberedList.classList.toggle('is-active', isOrdered);

      btnLink.setAttribute('aria-pressed', hasLink ? 'true' : 'false');
      btnLink.classList.toggle('is-active', hasLink);

      // Undo / Redo enabled states
      const canUndo = document.queryCommandEnabled('undo');
      const canRedo = document.queryCommandEnabled('redo');
      btnUndo.disabled = !canUndo;
      btnRedo.disabled = !canRedo;
    } catch {
      // ignore security/unsupported errors
    }
  }

  // Link Popover management
  function closeLinkPopover() {
    if (activeLinkPopover) {
      activeLinkPopover.remove();
      activeLinkPopover = null;
      editorEl.focus();
    }
  }

  function openLinkPopover(anchorBtn) {
    if (activeLinkPopover) {
      closeLinkPopover();
      return;
    }

    const existingLink = getSelectedLink();
    const savedSelection = saveSelectionRange();

    const popover = document.createElement('div');
    popover.className = 'link-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Edit link');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'link-popover-input';
    input.placeholder = 'https://example.com';
    input.value = existingLink ? existingLink.getAttribute('href') || '' : '';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'link-popover-error';

    const actions = document.createElement('div');
    actions.className = 'link-popover-actions';

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'btn-primary link-popover-apply';
    applyBtn.textContent = 'Apply';

    actions.appendChild(applyBtn);

    if (existingLink) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-secondary link-popover-remove';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        restoreSelectionRange(savedSelection);
        exec('unlink');
        closeLinkPopover();
      });
      actions.appendChild(removeBtn);
    }

    applyBtn.addEventListener('click', () => {
      const url = input.value.trim();
      const lower = url.toLowerCase();
      if (!lower.startsWith('http://') && !lower.startsWith('https://') && !lower.startsWith('mailto:')) {
        errorDiv.textContent = 'URL must start with http://, https://, or mailto:';
        input.focus();
        if (typeof onAnnounce === 'function') {
          onAnnounce('URL must start with http://, https://, or mailto:');
        }
        return;
      }

      restoreSelectionRange(savedSelection);
      exec('createLink', url);

      // Find created links and set safe attributes
      const linkEl = getSelectedLink();
      if (linkEl) {
        linkEl.setAttribute('target', '_blank');
        linkEl.setAttribute('rel', 'noopener noreferrer');
        linkEl.classList.add('card-link');
      }

      closeLinkPopover();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeLinkPopover();
      }
    });

    popover.appendChild(input);
    popover.appendChild(errorDiv);
    popover.appendChild(actions);

    container.appendChild(popover);
    activeLinkPopover = popover;

    // Position relative to anchor
    const anchorRect = anchorBtn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    popover.style.left = `${Math.max(8, anchorRect.left - containerRect.left)}px`;
    popover.style.top = `${anchorRect.bottom - containerRect.top + 6}px`;

    input.focus();
  }

  function saveSelectionRange() {
    const sel = window.getSelection();
    return sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  }

  function restoreSelectionRange(range) {
    if (!range) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Keyboard shortcut Ctrl+K / Cmd+K for link
  editorEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openLinkPopover(btnLink);
    }
  });

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (sel && sel.anchorNode && editorEl.contains(sel.anchorNode)) {
      updateToolbarState();
    }
  });

  // Global click outside to dismiss link popover
  document.addEventListener('click', (e) => {
    if (activeLinkPopover && !activeLinkPopover.contains(e.target) && !btnLink.contains(e.target)) {
      closeLinkPopover();
    }
  });

  container.appendChild(toolbar);
  updateToolbarState();

  return {
    updateState: updateToolbarState
  };
}
