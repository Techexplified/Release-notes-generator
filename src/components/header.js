import { APP_NAME } from '../config.js';

/**
 * Renders the top app header into the specified container element.
 * Format: [Blue Release Notes Logo] [Title "Release Notes Generator"] aligned on the left.
 *
 * @param {HTMLElement} container
 */
export function renderHeader(container) {
  if (!container) return;

  const header = document.createElement('header');
  header.className = 'app-header';

  const brand = document.createElement('div');
  brand.className = 'header-brand';

  // Professional Release Notes document/changelog icon in primary blue (#0C66E4)
  brand.innerHTML = `
    <span class="header-logo-badge" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C66E4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="8 9 9.5 10.5 12 8"></polyline>
      </svg>
    </span>
  `;

  const title = document.createElement('h1');
  title.className = 'header-title';
  title.textContent = APP_NAME;

  brand.appendChild(title);
  header.appendChild(brand);

  container.innerHTML = '';
  container.appendChild(header);
}
