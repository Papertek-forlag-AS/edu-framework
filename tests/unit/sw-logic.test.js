/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';

// Simplified logic from service-worker-manager.js/sw.js
const isLocalhost = (hostname) => {
    return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.');
};

const getSwEnabled = (hostname, forceSw = null) => {
    return !isLocalhost(hostname) || forceSw === 'true';
};

describe('Service Worker Environment Detection', () => {
    it('should be disabled on localhost', () => {
        expect(getSwEnabled('localhost')).toBe(false);
    });

    it('should be disabled on 127.0.0.1', () => {
        expect(getSwEnabled('127.0.0.1')).toBe(false);
    });

    it('should be disabled on local network IP', () => {
        expect(getSwEnabled('192.168.1.50')).toBe(false);
    });

    it('should be enabled on production domain', () => {
        expect(getSwEnabled('tysk1.no')).toBe(true);
    });

    it('should be enabled on Vercel preview domain', () => {
        expect(getSwEnabled('tysk-niv-1-git-develop-geirjr.vercel.app')).toBe(true);
    });

    it('should allow override on localhost', () => {
        expect(getSwEnabled('localhost', 'true')).toBe(true);
    });
});
