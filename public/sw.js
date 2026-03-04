/**
 * Progressive Service Worker with Smart Caching
 * Version: v1.7.1 (Audio CDN fix — audio ZIPs now available)
 */

// ============================================================================
// 🔧 ENVIRONMENT DETECTION
// ============================================================================
const isLocalhost = () => {
  return self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    self.location.hostname.startsWith('192.168.');
};

// Enabled on production/staging, disabled on localhost by default
const SW_ENABLED = !isLocalhost();

// Listen for skipWaiting message (works in both dev and prod mode)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('📨 Received SKIP_WAITING message - activating new service worker immediately');
    self.skipWaiting();
  }
});
// ============================================================================

if (!SW_ENABLED) {
  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  self.addEventListener('activate', async (event) => {
    event.waitUntil(
      (async () => {
        const registrations = await self.registration.unregister();
        console.log('🔧 DEV MODE: Service worker unregistered');
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_DISABLED',
            message: 'Service worker disabled for development. Reload page for fresh content.'
          });
        });
      })()
    );
  });
} else {
  console.log('✅ PRODUCTION MODE: Service worker is ENABLED');

  // Listen for curriculum caching messages (production mode only)
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_CURRICULUM') {
      const curriculumId = event.data.curriculumId;
      console.log(`📚 Received CACHE_CURRICULUM request for: ${curriculumId}`);
      cacheCurriculum(curriculumId, event.source);
    }
  });

  const VERSION = 'v1.7.0-202602132317'; // vSTAMP - Dictionary extension with 3,196 words, Chirp3 HD audio
  const CACHE_NAME = `papertek-portal-${VERSION}`;
  const RUNTIME_CACHE = `papertek-runtime-${VERSION}`;

  // Curriculum caches - these persist across SW updates
  const CURRICULUM_CACHE_PREFIX = 'papertek-curriculum-';

  // Media caches - these persist across SW updates
  const MEDIA_CACHE_PREFIX = 'papertek-media-';

  // Mapping of curriculum IDs to their manifest paths
  const CURRICULUM_MANIFESTS = {
    'tysk1-vg1': '/manifests/tysk1-vg1.json',
    'spansk1-vg1': '/manifests/spansk1-vg1.json'
  };

  const DEBUG_LOGGING = false;
  function logDebug(...args) {
    if (DEBUG_LOGGING) {
      console.log(`[SW ${VERSION}]`, ...args);
    }
  }

  function logError(...args) {
    console.error(`[SW ${VERSION}]`, ...args);
  }

  const MAX_CACHE_SIZE = 50 * 1024 * 1024;

  const CORE_CACHE_FILES = [
    './',
    './index.html',
    './tysk/index.html',
    './spansk/index.html',
    './manifest.json',
    './tysk/offline.html',
    './spansk/offline.html',

    // Shared Vocabulary (JSON) - Loaded on demand
    // './shared/vocabulary/german/nounbank.json',
    // './shared/vocabulary/german/verbbank.json',
    // './shared/vocabulary/german/generalbank.json',
    // './shared/vocabulary/german/adjectivebank.json',

    // CSS
    './stylesheet.css',
    './papertek.css',

    // Core JavaScript modules
    './js/main.js',
    './js/ui.js',
    './js/exercises.js',
    './js/utils.js',
    './js/accessibility.js',
    './js/error-handler.js',
    './js/logger.js',
    './js/test.js',
    './js/project.js',
    './js/modals.js',
    './js/lessons-content-loader.js',
    './js/grammar-content-loader.js',
    './js/grammar-renderer.js',
    './js/exercises-content-loader.js',

    // Progress modules
    './js/progress/index.js',
    './js/progress/store.js',
    './js/progress/config.js',
    './js/progress/achievements.js',
    './js/progress/celebrations.js',
    './js/progress/curriculum.js',
    './js/progress/icons.js',
    './js/progress/import-export.js',
    './js/progress/migration.js',
    './js/progress/repair.js',
    './js/progress/reset.js',
    './js/progress/tests.js',
    './js/progress/ui.js',
    './js/progress/curriculum-registry.js',

    // Exercise modules
    './js/exercises/core-reset.js',
    './js/exercises/storage-utils.js',
    './js/exercises/quiz.js',
    './js/exercises/matching-game.js',
    './js/exercises/image-matching-game.js',
    './js/exercises/fill-in.js',
    './js/exercises/true-false.js',
    './js/exercises/drag-drop-sentences.js',
    './js/exercises/writing.js',
    './js/exercises/minidialog.js',
    './js/exercises/dilemma.js',
    './js/exercises/chronology.js',
    './js/dialog/jeopardy.js',
    './js/dialog/tier-rennen.js',
    './js/dialog/bingo.js',
    './js/dialog/ord-battle.js',
    './js/exercises/embedded-verb-trainer.js',
    './js/exercises/embedded-gender-trainer.js',
    './js/exercises/interactive-flashcards.js',
    './js/exercises/number-grids.js',
    './js/exercises/color-picker.js',
    './js/exercises/checklist.js',
    './js/exercises/interactive-map.js',
    './js/exercises/interactive-clock.js',

    // Vocab Trainer Multi modules
    './js/vocab-trainer-multi/index.js',
    './js/vocab-trainer-multi/flashcards.js',
    './js/vocab-trainer-multi/match.js',
    './js/vocab-trainer-multi/test.js',
    './js/vocab-trainer-multi/verb-test.js',
    './js/vocab-trainer-multi/write.js',
    './js/vocab-trainer-multi/vocabulary-loader.js',
    './js/vocab-trainer-multi/utils/answer-validation.js',
    './js/vocab-trainer-multi/utils/known-words.js',
    './js/vocab-trainer-multi/utils/levenshtein.js',
    './js/vocab-trainer-multi/utils/storage.js',
    './js/vocab-trainer-multi/gender.js',

    // Additional content modules
    './js/dialog/classroom-dialog-loader.js',

    // Grammar modules
    './js/grammar-modules/cases-prepositions.js',
    './js/grammar-modules/prepositions/prepositions-data.js',
    './js/grammar-modules/prepositions/akkusativ-prepositions.js',
    './js/grammar-modules/prepositions/dativ-prepositions.js',

    // Layout and page initialization
    './js/layout/shell.js',
    './js/page-init.js',

    // Core services
    './js/core/VocabProfileService.js',
    './js/core/SM2Algorithm.js',
    './js/core/adapters/BlobAdapter.js',

    // Utilities
    './js/utils/content-loader.js',
    './js/utils/word-tooltips.js',
    './js/utils/debug-utils.js',
    './js/utils/i18n.js',
    './js/utils/environment-indicator.js',
    './js/utils/report-modal.js',

    // Feedback system
    './js/feedback/index.js',
    './js/feedback/feedback-widget.js',
    './js/feedback/context-collector.js',

    // Localization
    './js/locales/no.js',
    './js/locales/en.js',

    // Offline/Download Manager
    './js/offline/download-manager.js',

    // Authentication modules
    './js/auth/firebase-client.js',
    './js/auth/firebase-feide-auth.js',
    './js/auth/google-auth.js',
    './js/auth/auth-ui.js',
    './js/sync/cloud-sync.js',
    './js/sync/migration.js',
    './js/config/env.js',

    // Auth Callback
    './auth-callback.html',

    // Fonts
    './bibliotek/fonts/inter-v19-latin-regular.woff2',
    './bibliotek/fonts/inter-v19-latin-600.woff2',
    './bibliotek/fonts/inter-v19-latin-700.woff2',

    // Chart library
    './bibliotek/chart.min.js',

    // Icons
    './ikoner/icon-192x192.png',
    './ikoner/icon-512x512.png'
  ];

  /**
   * Cache all files for a curriculum based on its manifest
   * @param {string} curriculumId - The curriculum ID (e.g., 'tysk1-vg1')
   * @param {Client} client - The client that requested the cache (for progress updates)
   */
  async function cacheCurriculum(curriculumId, client) {
    const manifestPath = CURRICULUM_MANIFESTS[curriculumId];
    if (!manifestPath) {
      console.error(`[SW] Unknown curriculum: ${curriculumId}`);
      if (client) {
        client.postMessage({
          type: 'CURRICULUM_CACHE_ERROR',
          curriculumId,
          error: `Unknown curriculum: ${curriculumId}`
        });
      }
      return;
    }

    const cacheName = `${CURRICULUM_CACHE_PREFIX}${curriculumId}`;

    try {
      // Check if already cached
      const existingCache = await caches.open(cacheName);
      const keys = await existingCache.keys();
      if (keys.length > 10) {
        console.log(`[SW] Curriculum ${curriculumId} already cached (${keys.length} files)`);
        if (client) {
          client.postMessage({
            type: 'CURRICULUM_CACHE_COMPLETE',
            curriculumId,
            fileCount: keys.length,
            fromCache: true
          });
        }
        return;
      }

      // Notify client that caching has started
      if (client) {
        client.postMessage({
          type: 'CURRICULUM_CACHE_START',
          curriculumId
        });
      }

      // Fetch the manifest
      const manifestResponse = await fetch(manifestPath);
      if (!manifestResponse.ok) {
        throw new Error(`Failed to fetch manifest: ${manifestResponse.status}`);
      }
      const manifest = await manifestResponse.json();

      // Collect all files to cache
      const allFiles = [
        ...manifest.files.lessons,
        ...manifest.files.exercises,
        ...manifest.files.grammar,
        ...manifest.files.vocabulary,
        ...manifest.files.wordbanks
      ];

      console.log(`[SW] Caching ${allFiles.length} files for ${curriculumId}...`);

      // Cache files in batches for progress updates
      const batchSize = 10;
      let cachedCount = 0;
      let failedCount = 0;
      const cache = await caches.open(cacheName);

      for (let i = 0; i < allFiles.length; i += batchSize) {
        const batch = allFiles.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (url) => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                return true;
              }
              return false;
            } catch (err) {
              console.warn(`[SW] Failed to cache ${url}:`, err.message);
              return false;
            }
          })
        );

        cachedCount += results.filter(r => r.status === 'fulfilled' && r.value).length;
        failedCount += results.filter(r => r.status === 'rejected' || !r.value).length;

        // Send progress update
        if (client) {
          client.postMessage({
            type: 'CURRICULUM_CACHE_PROGRESS',
            curriculumId,
            cached: cachedCount,
            failed: failedCount,
            total: allFiles.length,
            percent: Math.round((cachedCount / allFiles.length) * 100)
          });
        }
      }

      console.log(`[SW] ✅ Curriculum ${curriculumId} cached: ${cachedCount} files (${failedCount} failed)`);

      if (client) {
        client.postMessage({
          type: 'CURRICULUM_CACHE_COMPLETE',
          curriculumId,
          fileCount: cachedCount,
          failedCount,
          fromCache: false
        });
      }

    } catch (error) {
      console.error(`[SW] Error caching curriculum ${curriculumId}:`, error);
      if (client) {
        client.postMessage({
          type: 'CURRICULUM_CACHE_ERROR',
          curriculumId,
          error: error.message
        });
      }
    }
  }

  self.addEventListener('install', event => {
    console.log(`[SW ${VERSION}] 📦 Installing...`);
    self.skipWaiting(); // Force activate

    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log(`[SW ${VERSION}] 💾 Caching ${CORE_CACHE_FILES.length} core files...`);
          // Use cache: 'reload' to ensure we get fresh files
          const cachePromises = CORE_CACHE_FILES.map(url => {
            return fetch(new Request(url, { cache: 'reload' }))
              .then(response => {
                if (response.status >= 200 && response.status < 300) {
                  return cache.put(url, response);
                }
                console.warn(`[SW ${VERSION}] ⚠️ Failed to fetch ${url}: ${response.status}`);
                return Promise.resolve();
              })
              .catch(err => {
                console.error(`[SW ${VERSION}] ❌ Error caching ${url}:`, err);
                return Promise.resolve();
              });
          });
          return Promise.all(cachePromises);
        })
    );
  });

  self.addEventListener('activate', event => {
    console.log(`[SW ${VERSION}] Activating...`);
    event.waitUntil(
      caches.keys()
        .then(cacheNames => {
          const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
          return Promise.all(
            cacheNames.map(cacheName => {
              // Keep curriculum caches across SW updates
              if (cacheName.startsWith(CURRICULUM_CACHE_PREFIX)) {
                console.log(`[SW ${VERSION}] 📚 Keeping curriculum cache:`, cacheName);
                return Promise.resolve();
              }
              // Keep media caches across SW updates
              if (cacheName.startsWith(MEDIA_CACHE_PREFIX)) {
                console.log(`[SW ${VERSION}] 🎵 Keeping media cache:`, cacheName);
                return Promise.resolve();
              }
              if (!currentCaches.includes(cacheName)) {
                console.log(`[SW ${VERSION}] 🗑️ Deleting old cache:`, cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        })
        .then(() => self.clients.claim())
        .then(() => self.clients.matchAll())
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_ACTIVATED', version: VERSION });
          });
        })
    );
  });

  function shouldCache(url) {
    if (!url.startsWith(self.location.origin)) return false;
    const cacheableExtensions = ['.html', '.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.woff', '.woff2', '.ttf', '.json', '.mp3', '.wav', '.m4a', '.ogg'];
    return cacheableExtensions.some(ext => url.endsWith(ext));
  }

  async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.status === 200 && shouldCache(request.url)) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      throw error;
    }
  }

  async function networkFirst(request) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.status === 200) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Network failed
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;

      // Offline Fallback Logic
      if (request.url.endsWith('.html') || request.mode === 'navigate') {
        const url = request.url;

        // German App Fallback
        if (url.includes('/tysk/') || url.includes('/german/')) {
          const fallback = await caches.match('./tysk/offline.html');
          if (fallback) return fallback;
        }

        // Spanish App Fallback
        if (url.includes('/spansk/') || url.includes('/spanish/')) {
          const fallback = await caches.match('./spansk/offline.html');
          if (fallback) return fallback;
        }

        // Generic / Root Fallback
        const rootFallback = await caches.match('./index.html');
        if (rootFallback) return rootFallback;
      }
      throw error;
    }
  }

  self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    // HTML & Main JS -> Network First (so updates are seen)
    if (request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('main.js')) {
      event.respondWith(networkFirst(request));
    }
    // Assets -> Cache First
    else if (shouldCache(request.url)) {
      event.respondWith(cacheFirst(request));
    }
    // API/Others -> Network only (or basic fallback)
    else {
      event.respondWith(fetch(request).catch(() => caches.match(request)));
    }
  });

}
