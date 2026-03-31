// service-worker-manager.ts

/**
 * Selective cache cleanup function to manage cached resources.
 * @param {string} cacheName - The name of the cache to clean.
 * @param {Array<string>} resourcesToKeep - List of resources to keep in cache.
 */
async function selectiveCacheCleanup(cacheName, resourcesToKeep) {
    const cache = await caches.open(cacheName);
    const cachedRequests = await cache.keys();
    const resourcesToKeepSet = new Set(resourcesToKeep);

    for (const request of cachedRequests) {
        const url = new URL(request.url);
        if (!resourcesToKeepSet.has(url.pathname) && !resourcesToKeepSet.has(url.href)) {
            await cache.delete(request);
        }
    }
}

/**
 * Improved Service Worker management functions to add/update service worker.
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered with scope:', registration.scope);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    } else {
        console.log('Service Workers are not supported in this browser.');
    }
}

// Export the functions for use in other modules
export { selectiveCacheCleanup, registerServiceWorker };