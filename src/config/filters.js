// Filter options for the card selection step
export const FILTERS = [
  { id: 'all', label: 'All cards', days: null },
  { id: 'last7', label: 'Completed in last 7 days', days: 7 },
  { id: 'last14', label: 'Completed in last 14 days', days: 14 },
  { id: 'last30', label: 'Completed in last 30 days', days: 30 }
];

export const DEFAULT_FILTER_ID = 'last14';

