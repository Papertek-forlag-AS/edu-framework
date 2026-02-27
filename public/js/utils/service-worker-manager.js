/**
 * Service Worker Manager
 * Handles registration, updates, and release notes display
 */

// Helper to check if running on localhost
const isLocalhost = () => {
    return window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168.');
};

// Service Worker Configuration
// Enabled on production/staging, disabled on localhost (unless forced)
export const SW_ENABLED = !isLocalhost() || localStorage.getItem('force-sw') === 'true';
export const SW_VERSION = 'v1.7.0-202602132317'; // vSTAMP

// Release notes for specific versions
export const releaseNotes = {
    'v1.7.0-202602132317': [
        "📖 Utvidet ordbok: 3 196 tyske ord med oppslag og søk",
        "🔊 Forbedret lydkvalitet: Alle ord med ny Chirp3 HD-stemme",
        "🔍 Nytt søke-API (v2) for ordbok-utvidelsen"
    ],
    'v1.6.4-202602112215': [
        "🔧 Kritisk fiks: Ukentlige poeng vises nå riktig på ranglisten",
        "📚 Nye synonymer i ordbanken",
        "🙏 Takk til Tysk 1 ved STB i Bærum for innrapportering av ord!"
    ],
    'v1.6.3-202602112100': [
        "📚 Nye synonymer i ordbanken: mamma, eksamen, matte, yndlingsdyr, badesaker, gå med hunden, og flere",
        "🇩🇪 Tyske synonymer: beginnen/anfangen, Obst/Frucht, viel/sehr",
        "🙏 Takk til Tysk 1 ved STB i Bærum for innrapportering av ord!"
    ],
    'v1.6.2-202602012300': [
        "🔧 Fikset ordoppslag for tyske ord med ß (heißen, etc.)",
        "📖 Forbedret substantiv-oppslag (Jahr/Jahre)",
        "🔊 Fikset lyd for ordforklaringer"
    ],
    'vUniversal-1.0': [
        "🌍 Ny offline-teknologi: Appen fungerer nå mye bedre uten nett",
        "🛠️ Fikset problem med 'Site cant be reached' på leksjoner",
        "⚡ Raskere lasting av sider",
        "💾 Mer robust lagring av data"
    ],
    'v295': [
        "🔧 Fikset visning av tyske umlauter (ä, ö, ü)",
        "🛠️ Mindre feilrettinger"
    ],
    'v294': [
        "⚔️ Ord-Battle: Fikset problem med import av ordlister",
        "🖼️ Ryddet opp i unødvendige bilder i leksjoner",
        "🔧 Generelle forbedringer"
    ],
    'v293': [
        "🔧 Generelle forbedringer og feilrettinger",
        "⚡ Ytelsesforbedringer"
    ],
    'v291': [
        "🖨️ Forbedret utskrift for leksjon 5.1 (Timeline Task)",
        "💪 Ny oppgave: Min Tidslinje",
        "🧠 Forbedringer i Glose-treneren",
        "🔧 Diverse feilrettinger og forbedringer"
    ],
    'v285': [
        "⚠️ Viktig strukturell oppdatering",
        "🛠️ Ny lagringsstruktur for fremgang",
        "🔧 Teknisk vedlikehold"
    ],
    'v265': [
        "🔧 Teknisk fiks for oppdaterings-systemet",
        "🛠️ Fikset manglende grammatikk i leksjon 1.3",
        "🎅 Frohe Weihnachten - God jul! 🎄"
    ]
};

/**
 * Show release notes modal if version changed
 */
export function checkAndShowReleaseNotes(currentVersion) {
    const storedVersion = localStorage.getItem('app_version');

    if (storedVersion !== currentVersion && releaseNotes[currentVersion]) {
        const notes = releaseNotes[currentVersion].map(note => `<li class="mb-2">${note}</li>`).join('');

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-neutral-900/50 z-[100] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in relative">
                <button id="close-notes-btn" class="absolute top-4 right-4 text-neutral-500 hover:text-neutral-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <h2 class="text-2xl font-bold text-neutral-800 mb-2">Hva er nytt? 🎉</h2>
                <p class="text-neutral-500 mb-4 text-sm">Versjon ${currentVersion}</p>
                <ul class="list-disc list-inside text-neutral-700 mb-6 space-y-1">
                    ${notes}
                </ul>
                <button id="ok-notes-btn" class="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                    Supert!
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => {
            modal.remove();
            localStorage.setItem('app_version', currentVersion);
        };

        document.getElementById('close-notes-btn').addEventListener('click', closeModal);
        document.getElementById('ok-notes-btn').addEventListener('click', closeModal);
    } else {
        // Just update storage if no notes or same version
        localStorage.setItem('app_version', currentVersion);
    }
}

/**
 * Show update toast/modal when new SW version is available
 */
function showUpdateToast() {
    // Check if toggle is already shown to avoid duplicates
    if (document.getElementById('sw-update-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'sw-update-modal';
    modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
            <h2 class="text-2xl font-bold text-primary-700 mb-4">✨ Ny oppdatering tilgjengelig (${SW_VERSION})</h2>

            <div class="mb-6 space-y-3">
                <p class="text-neutral-700 font-semibold">Hva er nytt?</p>
                <ul class="list-disc list-inside text-neutral-600 text-sm space-y-1 mb-4">
                    ${(releaseNotes[SW_VERSION] || ["🔧 Generelle forbedringer og feilrettinger"]).map(note => `<li>${note}</li>`).join('')}
                </ul>

                <div class="bg-info-50 border-l-4 border-info-500 p-3 rounded">
                    <p class="text-xs text-info-800">
                        Oppdateringen tar bare noen få sekunder.
                    </p>
                </div>
            </div>

            <button id="update-app-btn" class="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md">
                Oppdater nå
            </button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('update-app-btn').addEventListener('click', async () => {
        console.log('🔄 FORCE UPDATE: Starting aggressive update sequence...');

        // Update modal to show progress
        modal.innerHTML = `
            <div class="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <div class="text-center">
                    <div class="text-6xl mb-4 animate-spin">🔄</div>
                    <h2 class="text-2xl font-bold text-neutral-800 mb-2">Oppdaterer appen...</h2>
                    <p class="text-neutral-600">Vennligst vent mens vi laster ny versjon</p>
                </div>
            </div>
        `;

        try {
            // Step 1: Clear all caches
            console.log('🗑️ Clearing all caches...');
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => {
                console.log(`  Deleting cache: ${name}`);
                return caches.delete(name);
            }));
            console.log('✅ All caches cleared');

            // Step 2: Unregister ALL service workers
            console.log('🔧 Unregistering all service workers...');
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => {
                console.log('  Unregistering service worker');
                return reg.unregister();
            }));
            console.log('✅ All service workers unregistered');

            // Step 3: Show success message
            modal.innerHTML = `
                <div class="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                    <div class="text-center">
                        <div class="text-6xl mb-4">✅</div>
                        <h2 class="text-2xl font-bold text-success-700 mb-2">Klar til oppdatering!</h2>
                        <p class="text-neutral-600">Laster ny versjon...</p>
                    </div>
                </div>
            `;

            // Wait a moment to show success
            await new Promise(resolve => setTimeout(resolve, 800));

            // Step 4: Set flag to prevent showing update prompt again immediately
            localStorage.setItem('force-update-in-progress', 'true');

            // Step 5: Force hard reload from server (bypass all caches)
            console.log('🔃 Force reloading page...');
            window.location.reload(true);

        } catch (error) {
            console.error('❌ Force update failed:', error);
            // Fallback: Just reload anyway
            window.location.reload(true);
        }
    });
}

/**
 * Register the service worker and set up update handling
 */
export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('[SW] Service Worker not supported');
        return;
    }

    if (!SW_ENABLED) {
        // If SW is disabled, unregister any existing service workers
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister().then(success => {
                    if (success) console.log('🔧 Service Worker unregistered (dev mode)');
                });
            }
        });

        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('🔧 All caches cleared (dev mode)');
            });
        }
        return;
    }

    // Determine the correct path for sw.js based on current location
    let swPath = '/sw.js'; // Default for production domain root

    // If served from a development server where /public/ is in the URL
    if (window.location.pathname.includes('/public/')) {
        swPath = '/public/sw.js';
    } else if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        // Handle local dev without /public in path if served from root
        // But usually sticking to /public/sw.js is safer if structure is consistent
    }

    // Relative path adjustment for deep links? 
    // Ideally we use absolute paths like /public/sw.js to avoid relative hell.

    console.log(`[SW] Attempting to register Service Worker at: ${swPath}`);

    // Register WITHOUT query param to specific version to avoid registration mismatch/duplication
    // The byte-check by browser is sufficient for updates.
    navigator.serviceWorker.register(swPath)
        .then(registration => {
            console.log('Service Worker registered successfully:', registration.scope);

            // Check if there's already a waiting worker
            if (registration.waiting) {
                showUpdateToast();
            }

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('Service Worker update found!');

                newWorker.addEventListener('statechange', () => {
                    console.log('Service Worker state changed:', newWorker.state);
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content is available
                        console.log('New content is available; please refresh.');
                        showUpdateToast();
                    }
                });
            });
        })
        .catch(error => {
            console.log('Service Worker registration failed:', error);
        });

    // Reload page when new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        console.log('✅ New Service Worker took control, reloading page...');
        refreshing = true;
        window.location.reload(true); // Force reload from server
    });
}
