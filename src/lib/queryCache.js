// Simple query cache to prevent duplicate Firestore queries
// Stores pending promises and results with TTL (time-to-live)

const cache = new Map();
const PENDING_PROMISES = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Creates a cache key from query parameters
 */
function createCacheKey(collection, queryParams) {
  const params = JSON.stringify(queryParams);
  return `${collection}:${params}`;
}

/**
 * Gets cached data or executes query with deduplication
 * @param {string} collection - Firestore collection name
 * @param {object} queryParams - Query parameters
 * @param {Function} queryFn - Function that returns a Promise with the query
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Promise} Query result
 */
export async function getCachedQuery(collection, queryParams, queryFn, ttl = DEFAULT_TTL) {
  const cacheKey = createCacheKey(collection, queryParams);
  const now = Date.now();

  // Check if we have a valid cached result
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data;
  }

  // Check if there's already a pending request for this query
  if (PENDING_PROMISES.has(cacheKey)) {
    return PENDING_PROMISES.get(cacheKey);
  }

  // Execute the query and store the promise
  const promise = queryFn()
    .then((data) => {
      // Cache the result
      cache.set(cacheKey, {
        data,
        timestamp: now
      });

      // Remove from pending promises
      PENDING_PROMISES.delete(cacheKey);

      return data;
    })
    .catch((error) => {
      // Remove from pending promises on error
      PENDING_PROMISES.delete(cacheKey);
      throw error;
    });

  PENDING_PROMISES.set(cacheKey, promise);
  return promise;
}

/**
 * Invalidates cache for a specific collection
 */
export function invalidateCache(collection) {
  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (key.startsWith(`${collection}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
}

/**
 * Clears all cached data
 */
export function clearCache() {
  cache.clear();
  PENDING_PROMISES.clear();
}
