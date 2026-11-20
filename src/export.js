import { APP_KEY, APP_NAME, APP_AUTHOR } from './config.js';
import { renderHeader } from './components/header.js';
import { renderStepper } from './components/stepper.js';

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

// Render components
renderHeader(document.getElementById('header-root'));
renderStepper(document.getElementById('stepper-root'), 3); // Step 4 (Export) is active

// Back button handler
const btnBack = document.getElementById('btn-back');
if (btnBack) {
  btnBack.addEventListener('click', () => {
    btnBack.disabled = true;
    window.location.href = 'preview.html';
  });
}
