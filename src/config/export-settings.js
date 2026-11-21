/**
 * Export download strategy configuration.
 * Strategy options: 'client' | 'server'
 *
 * If downloads are blocked inside Trello's iframe sandbox on a real board, switch to 'server' and redeploy.
 */
export const DOWNLOAD_STRATEGY = 'client'; // 'client' | 'server'
