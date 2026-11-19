import { APP_NAME } from '../config.js';

/**
 * Renders the top Power-Up header into the specified container element.
 * Format: [Trello logo mark + "Trello"] [pill "Power-Up"] [vertical divider] [title "Release Notes Generator"]
 * NOTE: NO close/X button is rendered here because Trello provides its own modal chrome.
 *
 * @param {HTMLElement} container
 */
export function renderHeader(container) {
  if (!container) return;

  const header = document.createElement('header');
  header.className = 'app-header';

  const brand = document.createElement('div');
  brand.className = 'header-brand';

  // Inline SVG for the classic Trello board logo mark
  brand.innerHTML = `
    <svg class="header-logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0C66E4"/>
      <rect x="4" y="4.5" width="6.5" height="12" rx="1.5" fill="#FFFFFF"/>
      <rect x="13.5" y="4.5" width="6.5" height="8" rx="1.5" fill="#FFFFFF"/>
    </svg>
    <span class="header-trello-text">Trello</span>
    <span class="header-pill">Power-Up</span>
    <span class="header-divider" aria-hidden="true"></span>
  `;

  const title = document.createElement('h1');
  title.className = 'header-title';
  title.textContent = APP_NAME;

  brand.appendChild(title);
  header.appendChild(brand);

  container.innerHTML = '';
  container.appendChild(header);
}

