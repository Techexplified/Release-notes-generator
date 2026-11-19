// Stub data for local development, previews, and testing
// All dates are generated relative to execution time so filter presets (7, 14, 30 days) work consistently.

const now = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function relativeIso(daysAgo, hoursAgo = 0) {
  return new Date(now - daysAgo * DAY_MS - hoursAgo * 3600 * 1000).toISOString();
}

export const STUB_LISTS = [
  { id: 'list-done', name: 'Done' },
  { id: 'list-released', name: 'Released' },
  { id: 'list-in-review', name: 'In Review' },
  { id: 'list-backlog', name: 'Backlog' }
];

export const STUB_CARDS = [
  // --- List: Done (12 cards) ---
  // ~8 completed within last 14 days
  {
    id: 'card-done-1',
    name: 'Add dark mode to the app',
    url: 'https://trello.com/c/card-done-1',
    idList: 'list-done',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(1, 2),
    due: null
  },
  {
    id: 'card-done-2',
    name: 'Improve page load speed',
    url: 'https://trello.com/c/card-done-2',
    idList: 'list-done',
    labels: [{ id: 'lbl-imp', name: 'Improvement', color: 'green' }],
    completedAt: relativeIso(2, 5),
    due: null
  },
  {
    id: 'card-done-3',
    name: 'Fix login error on mobile',
    url: 'https://trello.com/c/card-done-3',
    idList: 'list-done',
    labels: [{ id: 'lbl-bug', name: 'Bug Fix', color: 'red' }],
    completedAt: relativeIso(4, 1),
    due: null
  },
  {
    id: 'card-done-4',
    name: 'Update user onboarding flow',
    url: 'https://trello.com/c/card-done-4',
    idList: 'list-done',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(6, 3),
    due: null
  },
  {
    id: 'card-done-5',
    name: 'Refactor settings page',
    url: 'https://trello.com/c/card-done-5',
    idList: 'list-done',
    labels: [{ id: 'lbl-imp', name: 'Improvement', color: 'green' }],
    completedAt: relativeIso(8, 6),
    due: null
  },
  {
    id: 'card-done-6',
    name: 'Resolve memory leak in real-time notification socket listener',
    url: 'https://trello.com/c/card-done-6',
    idList: 'list-done',
    labels: [{ id: 'lbl-bug', name: 'Bug Fix', color: 'red' }],
    completedAt: relativeIso(10, 4),
    due: null
  },
  // Card with TWO matching labels (Feature and Bug Fix) to test array-order category priority
  {
    id: 'card-done-7',
    name: 'Upgrade rich text editor with markdown table support',
    url: 'https://trello.com/c/card-done-7',
    idList: 'list-done',
    labels: [
      { id: 'lbl-feat', name: 'Feature', color: 'purple' },
      { id: 'lbl-bug', name: 'Bug Fix', color: 'red' }
    ],
    completedAt: relativeIso(11, 2),
    due: null
  },
  // Card with NO matching category label to test Uncategorized fallback
  {
    id: 'card-done-8',
    name: 'Update API documentation for webhooks v2',
    url: 'https://trello.com/c/card-done-8',
    idList: 'list-done',
    labels: [{ id: 'lbl-docs', name: 'Documentation', color: 'blue' }],
    completedAt: relativeIso(13, 7),
    due: null
  },
  // 2 completed within 15 to 30 days
  {
    id: 'card-done-9',
    name: 'Export release notes as formatted PDF',
    url: 'https://trello.com/c/card-done-9',
    idList: 'list-done',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(18, 3),
    due: null
  },
  // Card with very long name to test single line overflow and ellipsis truncation
  {
    id: 'card-done-10',
    name: 'Migrate legacy authentication microservice to OAuth 2.0 PKCE flow with automated token refresh and distributed session revocation across multi-region clusters',
    url: 'https://trello.com/c/card-done-10',
    idList: 'list-done',
    labels: [{ id: 'lbl-imp', name: 'Improvement', color: 'green' }],
    completedAt: relativeIso(24, 8),
    due: null
  },
  // 2 older than 30 days
  {
    id: 'card-done-11',
    name: 'Support multi-factor authentication with hardware security keys',
    url: 'https://trello.com/c/card-done-11',
    idList: 'list-done',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(42, 0),
    due: null
  },
  {
    id: 'card-done-12',
    name: 'Patch XSS vulnerability in user profile bio rendering',
    url: 'https://trello.com/c/card-done-12',
    idList: 'list-done',
    labels: [{ id: 'lbl-bug', name: 'Bug Fix', color: 'red' }],
    completedAt: relativeIso(65, 0),
    due: null
  },

  // --- List: Released (6 cards) ---
  {
    id: 'card-rel-1',
    name: 'Launch workspace member management UI',
    url: 'https://trello.com/c/card-rel-1',
    idList: 'list-released',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(3, 1),
    due: null
  },
  {
    id: 'card-rel-2',
    name: 'Speed up card search query execution time',
    url: 'https://trello.com/c/card-rel-2',
    idList: 'list-released',
    labels: [{ id: 'lbl-imp', name: 'Improvement', color: 'green' }],
    completedAt: relativeIso(5, 4),
    due: null
  },
  {
    id: 'card-rel-3',
    name: 'Fix broken attachments upload on Firefox',
    url: 'https://trello.com/c/card-rel-3',
    idList: 'list-released',
    labels: [{ id: 'lbl-bug', name: 'Bug Fix', color: 'red' }],
    completedAt: relativeIso(9, 2),
    due: null
  },
  {
    id: 'card-rel-4',
    name: 'Add Slack webhook integration',
    url: 'https://trello.com/c/card-rel-4',
    idList: 'list-released',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(12, 6),
    due: null
  },
  {
    id: 'card-rel-5',
    name: 'Fix cursor jump when editing long card description',
    url: 'https://trello.com/c/card-rel-5',
    idList: 'list-released',
    labels: [{ id: 'lbl-bug', name: 'Bug Fix', color: 'red' }],
    completedAt: relativeIso(20, 1),
    due: null
  },
  {
    id: 'card-rel-6',
    name: 'Automate weekly database backup snapshot retention',
    url: 'https://trello.com/c/card-rel-6',
    idList: 'list-released',
    labels: [{ id: 'lbl-imp', name: 'Enhancement', color: 'green' }],
    completedAt: relativeIso(35, 0),
    due: null
  },

  // --- List: In Review (4 cards) ---
  {
    id: 'card-rev-1',
    name: 'Add CSV export for activity log',
    url: 'https://trello.com/c/card-rev-1',
    idList: 'list-in-review',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(1, 1),
    due: null
  },
  {
    id: 'card-rev-2',
    name: 'Prevent duplicate notification emails during bulk card updates',
    url: 'https://trello.com/c/card-rev-2',
    idList: 'list-in-review',
    labels: [{ id: 'lbl-bug', name: 'Bug', color: 'red' }],
    completedAt: relativeIso(4, 3),
    due: null
  },
  {
    id: 'card-rev-3',
    name: 'Optimize bundle size with tree-shaking for SVG icons',
    url: 'https://trello.com/c/card-rev-3',
    idList: 'list-in-review',
    labels: [{ id: 'lbl-imp', name: 'Improvement', color: 'green' }],
    completedAt: relativeIso(8, 2),
    due: null
  },
  {
    id: 'card-rev-4',
    name: 'Add keyboard navigation shortcuts for card modal navigation',
    url: 'https://trello.com/c/card-rev-4',
    idList: 'list-in-review',
    labels: [{ id: 'lbl-feat', name: 'New Feature', color: 'purple' }],
    completedAt: relativeIso(16, 5),
    due: null
  },

  // --- List: Backlog (5 cards) ---
  {
    id: 'card-back-1',
    name: 'Custom domain support for public status pages',
    url: 'https://trello.com/c/card-back-1',
    idList: 'list-backlog',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(2, 6),
    due: null
  },
  {
    id: 'card-back-2',
    name: 'Audit and update all third-party npm security dependencies',
    url: 'https://trello.com/c/card-back-2',
    idList: 'list-backlog',
    labels: [{ id: 'lbl-imp', name: 'Improvement', color: 'green' }],
    completedAt: relativeIso(5, 2),
    due: null
  },
  {
    id: 'card-back-3',
    name: 'Fix contrast ratio on disabled secondary action buttons',
    url: 'https://trello.com/c/card-back-3',
    idList: 'list-backlog',
    labels: [{ id: 'lbl-bug', name: 'Fix', color: 'red' }],
    completedAt: relativeIso(11, 4),
    due: null
  },
  {
    id: 'card-back-4',
    name: 'Support recurring board card generation templates',
    url: 'https://trello.com/c/card-back-4',
    idList: 'list-backlog',
    labels: [{ id: 'lbl-feat', name: 'Feature', color: 'purple' }],
    completedAt: relativeIso(22, 1),
    due: null
  },
  {
    id: 'card-back-5',
    name: 'Add automated health checks for background worker queues',
    url: 'https://trello.com/c/card-back-5',
    idList: 'list-backlog',
    labels: [{ id: 'lbl-imp', name: 'Improvement', color: 'green' }],
    completedAt: relativeIso(48, 0),
    due: null
  }
];

