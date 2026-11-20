/**
 * In-page accessible modal confirmation dialog.
 * Replaces window.confirm/prompt which can be blocked inside Trello iframes.
 * Features focus trap, Esc to cancel, and focus restoration to trigger.
 *
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmLabel='Confirm']
 * @param {string} [options.cancelLabel='Cancel']
 * @param {boolean} [options.isDestructive=false]
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false
}) {
  return new Promise((resolve) => {
    const triggerElement = document.activeElement;

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';

    // Dialog Box
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog-box';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirm-dialog-title');
    dialog.setAttribute('aria-describedby', 'confirm-dialog-desc');

    const h3 = document.createElement('h3');
    h3.id = 'confirm-dialog-title';
    h3.className = 'confirm-dialog-title';
    h3.textContent = title;
    dialog.appendChild(h3);

    const p = document.createElement('p');
    p.id = 'confirm-dialog-desc';
    p.className = 'confirm-dialog-desc';
    p.textContent = message;
    dialog.appendChild(p);

    const actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary confirm-btn-cancel';
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = `btn-primary ${isDestructive ? 'confirm-btn-destructive' : ''}`;
    confirmBtn.textContent = confirmLabel;

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function cleanup(result) {
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
      if (triggerElement && typeof triggerElement.focus === 'function') {
        triggerElement.focus();
      }
      resolve(result);
    }

    cancelBtn.addEventListener('click', () => cleanup(false));
    confirmBtn.addEventListener('click', () => cleanup(true));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });

    // Focus trap & Esc
    const focusable = [cancelBtn, confirmBtn];
    confirmBtn.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
        return;
      }

      if (e.key === 'Tab') {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
  });
}
