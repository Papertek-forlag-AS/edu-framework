/**
 * Context Harvester - Dev-only UI debugging tool
 *
 * Lets you inspect any element on the page and copy its full context
 * (HTML, computed styles, URL, screen size, recent console errors)
 * as a Markdown block to your clipboard — ready to paste into Claude.
 *
 * Only activates on localhost, 127.0.0.1, and staging (*.vercel.app).
 */
(function () {
    'use strict';

    // ── Guard: only run in development / staging ────────────────────
    const host = window.location.hostname;
    const isDev = host === 'localhost' || host === '127.0.0.1';
    const isStaging = host.endsWith('.vercel.app');
    if (!isDev && !isStaging) return;

    // ── State ───────────────────────────────────────────────────────
    let inspecting = false;
    let hoveredEl = null;
    const consoleErrors = [];
    const MAX_ERRORS = 5;

    // ── Intercept console.error ─────────────────────────────────────
    const _origError = console.error;
    console.error = function (...args) {
        consoleErrors.push({
            time: new Date().toISOString(),
            message: args.map(a => {
                try { return typeof a === 'string' ? a : JSON.stringify(a); }
                catch { return String(a); }
            }).join(' ')
        });
        if (consoleErrors.length > MAX_ERRORS) consoleErrors.shift();
        _origError.apply(console, args);
    };

    // Also catch unhandled errors
    window.addEventListener('error', (e) => {
        consoleErrors.push({
            time: new Date().toISOString(),
            message: `${e.message} (${e.filename}:${e.lineno}:${e.colno})`
        });
        if (consoleErrors.length > MAX_ERRORS) consoleErrors.shift();
    });

    // ── Create UI elements ──────────────────────────────────────────

    // Floating trigger button
    const btn = document.createElement('button');
    btn.id = 'ctx-harvester-btn';
    btn.innerHTML = `<span style="font-size:20px">&#x1FA84;</span>`;
    btn.title = 'Context Harvester – Inspect an element';
    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: '999999',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '2px solid #a855f7',
        background: '#faf5ff',
        color: '#7e22ce',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
        transition: 'all 0.2s ease',
        fontFamily: 'system-ui, sans-serif',
        padding: '0',
    });
    btn.addEventListener('mouseenter', () => {
        if (!inspecting) btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
    });
    document.body.appendChild(btn);

    // Overlay outline element (follows hovered element)
    const overlay = document.createElement('div');
    overlay.id = 'ctx-harvester-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '999998',
        border: '3px solid #e11d9f',
        borderRadius: '4px',
        background: 'rgba(225,29,159,0.08)',
        display: 'none',
        transition: 'top 0.05s, left 0.05s, width 0.05s, height 0.05s',
    });
    document.body.appendChild(overlay);

    // Label showing tag name on hover
    const label = document.createElement('div');
    Object.assign(label.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '999999',
        background: '#e11d9f',
        color: '#fff',
        fontSize: '11px',
        fontFamily: 'monospace',
        padding: '2px 6px',
        borderRadius: '3px',
        display: 'none',
        whiteSpace: 'nowrap',
    });
    document.body.appendChild(label);

    // Toast notification
    const toast = document.createElement('div');
    toast.id = 'ctx-harvester-toast';
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        zIndex: '999999',
        background: '#16a34a',
        color: '#fff',
        padding: '10px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        opacity: '0',
        transition: 'opacity 0.3s, transform 0.3s',
        pointerEvents: 'none',
    });
    document.body.appendChild(toast);

    // ── Helper: show toast ──────────────────────────────────────────
    function showToast(msg) {
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
        }, 2000);
    }

    // ── Helper: build element selector path ─────────────────────────
    function getSelectorPath(el) {
        const parts = [];
        let cur = el;
        while (cur && cur !== document.body && cur !== document.documentElement) {
            let seg = cur.tagName.toLowerCase();
            if (cur.id) {
                seg += '#' + cur.id;
                parts.unshift(seg);
                break;
            }
            if (cur.className && typeof cur.className === 'string') {
                const classes = cur.className.trim().split(/\s+/).slice(0, 3).join('.');
                if (classes) seg += '.' + classes;
            }
            parts.unshift(seg);
            cur = cur.parentElement;
        }
        return parts.join(' > ');
    }

    // ── Helper: get meaningful computed style diff ──────────────────
    function getStyleDiff(el) {
        const computed = window.getComputedStyle(el);
        // Properties most useful for debugging layout/visual issues
        const props = [
            'display', 'position', 'top', 'right', 'bottom', 'left',
            'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
            'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap',
            'grid-template-columns', 'grid-template-rows',
            'overflow', 'overflow-x', 'overflow-y',
            'z-index', 'opacity', 'visibility',
            'background-color', 'color',
            'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
            'border-top-color', 'border-radius',
            'font-size', 'font-weight', 'line-height', 'text-align',
            'box-sizing', 'transform', 'transition',
        ];

        // Compare against a hidden reference element of the same tag
        const ref = document.createElement(el.tagName);
        ref.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
        document.body.appendChild(ref);
        const defaults = window.getComputedStyle(ref);

        const diff = {};
        for (const p of props) {
            const val = computed.getPropertyValue(p);
            const def = defaults.getPropertyValue(p);
            if (val && val !== def) {
                diff[p] = val;
            }
        }
        document.body.removeChild(ref);
        return diff;
    }

    // ── Helper: get ancestor chain (up to 3 levels) with classes ────
    function getAncestorChain(el) {
        const chain = [];
        let cur = el.parentElement;
        let depth = 0;
        while (cur && cur !== document.body && depth < 3) {
            const tag = cur.tagName.toLowerCase();
            const id = cur.id ? `#${cur.id}` : '';
            const cls = cur.className && typeof cur.className === 'string'
                ? '.' + cur.className.trim().split(/\s+/).join('.')
                : '';
            chain.push(`<${tag}${id}${cls}>`);
            cur = cur.parentElement;
            depth++;
        }
        return chain;
    }

    // ── Helper: truncate HTML if too long ────────────────────────────
    function truncateHTML(html, maxLen) {
        if (html.length <= maxLen) return html;
        return html.substring(0, maxLen) + '\n<!-- ... truncated (' + html.length + ' chars total) -->';
    }

    // ── Build Markdown output ───────────────────────────────────────
    function buildMarkdown(el) {
        const selector = getSelectorPath(el);
        const styleDiff = getStyleDiff(el);
        const ancestors = getAncestorChain(el);
        const rect = el.getBoundingClientRect();
        const outerHTML = truncateHTML(el.outerHTML, 3000);

        let md = '## UI Bug Context (auto-captured)\n\n';

        // Page info
        md += '### Page Info\n';
        md += `- **URL:** \`${window.location.href}\`\n`;
        md += `- **Viewport:** ${window.innerWidth} x ${window.innerHeight}\n`;
        md += `- **Screen:** ${screen.width} x ${screen.height} (DPR: ${window.devicePixelRatio})\n`;
        md += `- **User Agent:** \`${navigator.userAgent}\`\n\n`;

        // Selected element
        md += '### Selected Element\n';
        md += `- **Selector:** \`${selector}\`\n`;
        md += `- **Bounding Rect:** ${Math.round(rect.x)}, ${Math.round(rect.y)}, ${Math.round(rect.width)} x ${Math.round(rect.height)}\n`;
        if (ancestors.length > 0) {
            md += `- **Ancestors:** ${ancestors.join(' < ')}\n`;
        }
        md += '\n';

        // outerHTML
        md += '### Element HTML\n';
        md += '```html\n' + outerHTML + '\n```\n\n';

        // Computed styles diff
        const styleEntries = Object.entries(styleDiff);
        if (styleEntries.length > 0) {
            md += '### Computed Styles (non-default)\n';
            md += '```css\n';
            for (const [prop, val] of styleEntries) {
                md += `${prop}: ${val};\n`;
            }
            md += '```\n\n';
        }

        // Console errors
        if (consoleErrors.length > 0) {
            md += '### Recent Console Errors\n';
            md += '```\n';
            for (const err of consoleErrors) {
                md += `[${err.time}] ${err.message}\n`;
            }
            md += '```\n\n';
        }

        return md;
    }

    // ── Inspect mode handlers ───────────────────────────────────────
    function positionOverlay(el) {
        const rect = el.getBoundingClientRect();
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.display = 'block';

        // Label
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const dims = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
        label.textContent = `${tag}${id}  ${dims}`;
        label.style.display = 'block';

        // Position label above the element, or below if no room
        const labelH = 20;
        if (rect.top > labelH + 4) {
            label.style.top = (rect.top - labelH - 4) + 'px';
        } else {
            label.style.top = (rect.bottom + 4) + 'px';
        }
        label.style.left = rect.left + 'px';
    }

    function onMouseMove(e) {
        const target = e.target;
        // Ignore our own UI elements
        if (target === btn || target === overlay || target === label || target === toast) return;
        if (target.id && target.id.startsWith('ctx-harvester')) return;
        hoveredEl = target;
        positionOverlay(target);
    }

    function onInspectClick(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!hoveredEl) return;

        const md = buildMarkdown(hoveredEl);

        navigator.clipboard.writeText(md).then(() => {
            showToast('Context Copied!');
        }).catch(() => {
            // Fallback: open in a prompt
            window.prompt('Copy this context:', md);
        });

        exitInspect();
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            exitInspect();
        }
    }

    function enterInspect() {
        inspecting = true;
        btn.innerHTML = `<span style="font-size:16px">ESC</span>`;
        btn.style.background = '#e11d9f';
        btn.style.color = '#fff';
        btn.style.borderColor = '#e11d9f';
        document.body.style.cursor = 'crosshair';

        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('click', onInspectClick, true);
        document.addEventListener('keydown', onKeyDown, true);
    }

    function exitInspect() {
        inspecting = false;
        hoveredEl = null;
        btn.innerHTML = `<span style="font-size:20px">&#x1FA84;</span>`;
        btn.style.background = '#faf5ff';
        btn.style.color = '#7e22ce';
        btn.style.borderColor = '#a855f7';
        document.body.style.cursor = '';
        overlay.style.display = 'none';
        label.style.display = 'none';

        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onInspectClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
    }

    // ── Button click toggles inspect mode ───────────────────────────
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (inspecting) {
            exitInspect();
        } else {
            enterInspect();
        }
    });

    console.log('%c[Context Harvester] Ready. Click the wand button (bottom-left) to inspect.', 'color: #a855f7; font-weight: bold;');
})();
