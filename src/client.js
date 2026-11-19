import { APP_KEY, APP_NAME, APP_AUTHOR } from './config.js';

// Initialize the Trello Power-Up connector with board-buttons capability
window.TrelloPowerUp.initialize({
  'board-buttons': function (t, opts) {
    const origin = window.location.origin;
    return [
      {
        icon: {
          dark: `${origin}/icon-dark.svg`,
          light: `${origin}/icon-light.svg`
        },
        text: 'Release Notes',
        callback: function (t) {
          // Open step 1 modal
          // Do NOT pass a title because our page renders its own custom header
          return t.modal({
            url: './select-cards.html',
            height: 640,
            fullscreen: false
          });
        }
      }
    ];
  }
}, {
  appKey: APP_KEY,
  appName: APP_NAME,
  appAuthor: APP_AUTHOR
});

