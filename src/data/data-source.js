import { STUB_LISTS, STUB_CARDS } from './stub-data.js';
import { APP_KEY } from '../config.js';

// Simulated latency to make loading states, skeletons, and transitions visible during preview
const SIMULATED_LATENCY_MS = 300;
const CARD_LOOKUP_TIMEOUT_MS = 1500;

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Card lookup timed out')), timeoutMs))
  ]);
}

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
 *   due: string | null,
 *   dueComplete: boolean
 * }
 */

/**
 * Normalizes a raw card object (from Trello Power-Up client or REST API) into our contract shape.
 *
 * @param {Object} card
 * @returns {Object}
 */
export function normalizeCard(card) {
  if (!card) return null;

  // Normalize checklists
  const checklists = Array.isArray(card.checklists)
    ? card.checklists.map((cl) => {
        const rawItems = cl.checkItems || cl.items || [];
        return {
          id: cl.id || String(Math.random()),
          name: cl.name || '',
          pos: typeof cl.pos === 'number' ? cl.pos : 0,
          checkItems: Array.isArray(rawItems)
            ? rawItems.map((item) => ({
                id: item.id || String(Math.random()),
                name: item.name || '',
                state: item.state === 'complete' ? 'complete' : 'incomplete',
                pos: typeof item.pos === 'number' ? item.pos : 0
              }))
            : []
        };
      })
    : [];

  // Normalize labels: [{ id, name, color }]
  const labels = Array.isArray(card.labels)
    ? card.labels.map((lbl) => ({
        id: lbl.id || '',
        name: typeof lbl.name === 'string' ? lbl.name : '',
        color: lbl.color || ''
      }))
    : [];

  // Determine completion / activity timestamp for filtering
  let completedAt = card.completedAt;
  if (!completedAt) {
    if (card.dueComplete && card.due) {
      completedAt = card.due;
    } else if (card.dateLastActivity) {
      completedAt = card.dateLastActivity;
    } else {
      completedAt = new Date().toISOString();
    }
  }

  return {
    id: card.id,
    name: card.name || 'Untitled Card',
    desc: card.desc || '',
    url: card.url || (card.id ? `https://trello.com/c/${card.id}` : ''),
    idList: card.idList || '',
    labels,
    checklists,
    completedAt,
    due: card.due || null,
    dueComplete: Boolean(card.dueComplete)
  };
}

/**
 * Fetches lists on the current board along with their open card counts.
 * Uses t.lists() and t.cards() when running in Trello, falling back to STUB_LISTS outside Trello.
 *
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Array<{ id: string, name: string, cardCount: number }>>}
 */
export async function getLists(t) {
  if (t && typeof t.lists === 'function') {
    try {
      const [rawLists, rawCards] = await Promise.all([
        t.lists('id', 'name', 'closed').catch(() => t.lists('all')),
        typeof t.cards === 'function'
          ? t.cards('id', 'idList', 'closed').catch(() => t.cards('all'))
          : Promise.resolve([])
      ]);

      if (Array.isArray(rawLists) && rawLists.length > 0) {
        // Filter out closed/archived lists
        const openLists = rawLists.filter((l) => !l.closed);

        // Count open cards per list
        const cardCounts = new Map();
        if (Array.isArray(rawCards)) {
          for (const card of rawCards) {
            if (!card.closed && card.idList) {
              cardCounts.set(card.idList, (cardCounts.get(card.idList) || 0) + 1);
            }
          }
        }

        return openLists.map((list) => {
          const count = cardCounts.has(list.id)
            ? cardCounts.get(list.id)
            : (Array.isArray(list.cards) ? list.cards.length : 0);
          return {
            id: list.id,
            name: list.name,
            cardCount: count
          };
        });
      }
    } catch {
      // fallback to stub data below
    }
  }

  // Fallback to stub data for local dev / preview outside Trello
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
 * Tries the Trello REST API if authorized for full check-item details,
 * falls back to t.cards('all') from the Power-Up client,
 * and falls back to STUB_CARDS outside Trello.
 *
 * @param {Object} t - Trello Power-Up client instance
 * @param {string} listId - Trello list ID
 * @returns {Promise<Array<Object>>}
 */
export async function getCardsForList(t, listId) {
  if (t) {
    // 1. If REST API client is available and authorized, query REST API for complete card data with full checklists
    let restApi = null;
    try {
      if (typeof t.getRestApi === 'function') {
        restApi = t.getRestApi();
      }
    } catch {
      // ignore
    }

    if (restApi && typeof restApi.isAuthorized === 'function' && restApi.isAuthorized()) {
      try {
        const token = await restApi.getToken();
        if (token && APP_KEY && APP_KEY !== 'TODO_TRELLO_APP_KEY') {
          const url = `https://api.trello.com/1/lists/${encodeURIComponent(listId)}/cards?fields=id,name,url,idList,labels,desc,due,dueComplete,dateLastActivity&checklists=all&key=${encodeURIComponent(APP_KEY)}&token=${encodeURIComponent(token)}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              return data.map(normalizeCard).filter(Boolean);
            }
          }
        }
      } catch {
        // fallback to t.cards below
      }
    }

    // 2. Query board cards directly via Trello Power-Up client library
    if (typeof t.cards === 'function') {
      try {
        const rawCards = await t.cards('id', 'name', 'desc', 'due', 'dueComplete', 'labels', 'url', 'idList', 'dateLastActivity', 'checklists', 'closed')
          .catch(() => t.cards('all'));

        if (Array.isArray(rawCards) && rawCards.length > 0) {
          const listCards = rawCards.filter((card) => card.idList === listId && !card.closed);
          if (listCards.length > 0 || rawCards.some((c) => c.idList === listId)) {
            return listCards.map(normalizeCard).filter(Boolean);
          }
        }
      } catch {
        // fallback to stub cards below
      }
    }
  }

  // 3. Fallback to stub data for local dev / preview outside Trello
  return new Promise((resolve) => {
    setTimeout(() => {
      const cards = STUB_CARDS.filter((card) => card.idList === listId);
      resolve(cards.map(normalizeCard).filter(Boolean));
    }, SIMULATED_LATENCY_MS);
  });
}

/**
 * Fetches all visible cards across the board.
 *
 * @param {Object} t - Trello Power-Up client instance
 * @returns {Promise<Array<Object>>}
 */
export async function getAllCards(t) {
  if (t && typeof t.cards === 'function') {
    try {
      const rawCards = await t.cards('id', 'name', 'desc', 'due', 'dueComplete', 'labels', 'url', 'idList', 'dateLastActivity', 'checklists', 'closed')
        .catch(() => t.cards('all'));

      if (Array.isArray(rawCards) && rawCards.length > 0) {
        return rawCards.filter((card) => !card.closed).map(normalizeCard).filter(Boolean);
      }
    } catch {
      // fallback to stub cards below
    }
  }

  // Fallback to all stub cards
  return STUB_CARDS.map(normalizeCard).filter(Boolean);
}

/**
 * Retrieves card objects matching an array of card IDs.
 * Checks session cache first, then list-level fetch, then board-level fetch,
 * guaranteeing selected cards are received on subsequent wizard steps.
 *
 * @param {Object} t - Trello Power-Up client instance
 * @param {string[]} cardIds - Array of card IDs
 * @param {string} [listId] - Optional list ID
 * @returns {Promise<Array<Object>>}
 */
export async function getCardsByIds(t, cardIds, listId = null) {
  if (!Array.isArray(cardIds) || cardIds.length === 0) return [];
  // Keep the caller's order. Cache and Trello responses are not guaranteed to
  // use the same order as the user's selection.
  const orderedIds = [...new Set(cardIds)];
  const targetIds = new Set(orderedIds);
  const resultCards = new Map();

  // 1. Check sessionStorage caches
  try {
    const cachedSelected = sessionStorage.getItem('selectedCardsCache');
    if (cachedSelected) {
      const parsed = JSON.parse(cachedSelected);
      if (Array.isArray(parsed)) {
        parsed.forEach((c) => {
          if (c && targetIds.has(c.id)) {
            resultCards.set(c.id, normalizeCard(c));
          }
        });
      }
    }

    const cachedBoard = sessionStorage.getItem('boardCardsCache');
    if (cachedBoard && resultCards.size < targetIds.size) {
      const parsed = JSON.parse(cachedBoard);
      if (Array.isArray(parsed)) {
        parsed.forEach((c) => {
          if (c && targetIds.has(c.id) && !resultCards.has(c.id)) {
            resultCards.set(c.id, normalizeCard(c));
          }
        });
      }
    }
  } catch {
    // ignore
  }

  if (resultCards.size === targetIds.size) {
    return orderedIds.map((id) => resultCards.get(id));
  }

  // 2. Query target list if provided
  if (listId && t) {
    try {
      const listCards = await withTimeout(getCardsForList(t, listId), CARD_LOOKUP_TIMEOUT_MS);
      if (Array.isArray(listCards)) {
        listCards.forEach((c) => {
          if (c && targetIds.has(c.id) && !resultCards.has(c.id)) {
            resultCards.set(c.id, c);
          }
        });
      }
    } catch {
      // ignore
    }
  }

  if (resultCards.size === targetIds.size) {
    return orderedIds.map((id) => resultCards.get(id));
  }

  // 3. Query all board cards via t.cards
  if (t && typeof t.cards === 'function') {
    try {
      const allCards = await withTimeout(getAllCards(t), CARD_LOOKUP_TIMEOUT_MS);
      if (Array.isArray(allCards)) {
        allCards.forEach((c) => {
          if (c && targetIds.has(c.id) && !resultCards.has(c.id)) {
            resultCards.set(c.id, c);
          }
        });
      }
    } catch {
      // ignore
    }
  }

  if (resultCards.size === targetIds.size) {
    return orderedIds.map((id) => resultCards.get(id));
  }

  // 4. Fallback to STUB_CARDS for any remaining missing IDs
  STUB_CARDS.forEach((c) => {
    if (targetIds.has(c.id) && !resultCards.has(c.id)) {
      resultCards.set(c.id, normalizeCard(c));
    }
  });

  return orderedIds.filter((id) => resultCards.has(id)).map((id) => resultCards.get(id));
}
