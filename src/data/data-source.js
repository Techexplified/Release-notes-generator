import { STUB_LISTS, STUB_CARDS } from './stub-data.js';

// Simulated latency to make loading states, skeletons, and transitions visible during preview
const SIMULATED_LATENCY_MS = 300;

/**
 * Note on completedAt:
 * Trello has no completion timestamp (only dueComplete).
 * The real definition is an open decision; leading option is the date the card entered the source list
 * (REST actions, updateCard with listAfter). // TODO decide.
 */

/**
 * Card Shape Contract:
 * {
 *   id: string,
 *   name: string,
 *   desc?: string,
 *   url: string,
 *   idList: string,
 *   labels: Array<{ id: string, name: string, color: string }>,
 *   checklists?: Array<{
 *     id: string,
 *     name: string,
 *     pos: number,
 *     checkItems: Array<{
 *       id: string,
 *       name: string,
 *       state: 'complete' | 'incomplete',
 *       pos: number
 *     }>
 *   }>,
 *   completedAt: string,
 *   due: string | null
 * }
 */

/**
 * Fetches lists on the current board along with their open card counts.
 *
 * Contract:
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Array<{ id: string, name: string, cardCount: number }>>}
 */
export async function getLists(t) {
  // TODO: Replace with real Trello Power-Up call:
  // t.lists('id', 'name') combined with t.cards('id', 'idList', 'closed') to count open cards per list.
  return new Promise((resolve) => {
    setTimeout(() => {
      const listsWithCount = STUB_LISTS.map((list) => {
        const count = STUB_CARDS.filter((card) => card.idList === list.id).length;
        return {
          id: list.id,
          name: list.name,
          cardCount: count
        };
      });
      resolve(listsWithCount);
    }, SIMULATED_LATENCY_MS);
  });
}

/**
 * Fetches open cards belonging to the specified list, including checklists.
 *
 * Trello documents that check items are not guaranteed in t.cards(), and t.card() only works
 * inside a card context, so the real implementation should use the REST API:
 * GET /1/lists/{listId}/cards?fields=id,name,url,idList,labels,desc&checklists=all
 * with a token from t.getRestApi() (scope read; authorize() must run inside a click handler;
 * the Vercel origin must be in Allowed Origins). // TODO wire with the backend.
 *
 * Contract:
 * @param {Object} t - Trello Power-Up client instance
 * @param {string} listId - Trello list ID
 * @returns {Promise<Array<Object>>}
 */
export async function getCardsForList(t, listId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cards = STUB_CARDS.filter((card) => card.idList === listId);
      resolve(cards);
    }, SIMULATED_LATENCY_MS);
  });
}
