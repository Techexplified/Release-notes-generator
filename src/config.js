// Reads from Vite environment variables (prefixed with VITE_), falling back to placeholders
// TODO: Replace placeholders or set VITE_TRELLO_APP_KEY in your .env / Vercel Environment Variables
export const APP_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TRELLO_APP_KEY) || (typeof process !== 'undefined' && process.env?.VITE_TRELLO_APP_KEY) || 'TODO_TRELLO_APP_KEY';
export const APP_NAME = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TRELLO_APP_NAME) || (typeof process !== 'undefined' && process.env?.VITE_TRELLO_APP_NAME) || 'Release Notes Generator';
export const APP_AUTHOR = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TRELLO_APP_AUTHOR) || (typeof process !== 'undefined' && process.env?.VITE_TRELLO_APP_AUTHOR) || 'TODO_APP_AUTHOR';
