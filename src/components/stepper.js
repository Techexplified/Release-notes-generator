import { WIZARD_STEPS } from '../config/wizard-steps.js';

/**
 * Renders the 4-step wizard progress stepper into the container element.
 *
 * @param {HTMLElement} container - The DOM element to render into
 * @param {number} currentStepIndex - 0-based index of the currently active step (e.g., 0 for 'select', 1 for 'categorize')
 */
export function renderStepper(container, currentStepIndex = 0) {
  if (!container) return;

  const nav = document.createElement('nav');
  nav.className = 'stepper-nav';
  nav.setAttribute('aria-label', 'Wizard progress');

  const list = document.createElement('ol');
  list.className = 'stepper';

  WIZARD_STEPS.forEach((step, index) => {
    const isDone = index < currentStepIndex;
    const isActive = index === currentStepIndex;

    const li = document.createElement('li');
    li.className = 'stepper-step';

    if (isActive) {
      li.classList.add('stepper-step--active');
      li.setAttribute('aria-current', 'step');
    } else if (isDone) {
      li.classList.add('stepper-step--done');
    } else {
      li.classList.add('stepper-step--upcoming');
    }

    // Step circle / badge
    const badge = document.createElement('span');
    badge.className = 'stepper-badge';

    if (isDone) {
      // Done steps render as filled blue circle with a white check
      badge.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    } else {
      badge.textContent = String(index + 1);
    }

    // Step label
    const label = document.createElement('span');
    label.className = 'stepper-label';
    label.textContent = step.label;

    li.appendChild(badge);
    li.appendChild(label);
    list.appendChild(li);

    // Add connector line between steps (except after the last step)
    if (index < WIZARD_STEPS.length - 1) {
      const connector = document.createElement('li');
      connector.className = 'stepper-connector';
      connector.setAttribute('aria-hidden', 'true');
      list.appendChild(connector);
    }
  });

  nav.appendChild(list);
  container.innerHTML = '';
  container.appendChild(nav);
}
