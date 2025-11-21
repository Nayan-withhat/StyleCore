(function () {
    // Simple toast utility
    const TOAST_CONTAINER_ID = 'site-toast-container';
    function ensureContainer() {
        let c = document.getElementById(TOAST_CONTAINER_ID);
        if (!c) {
            c = document.createElement('div');
            c.id = TOAST_CONTAINER_ID;
            c.style.position = 'fixed';
            c.style.top = '12px';
            c.style.left = '50%';
            c.style.transform = 'translateX(-50%)';
            c.style.zIndex = 99999;
            c.style.display = 'flex';
            c.style.flexDirection = 'column';
            c.style.gap = '8px';
            c.style.alignItems = 'center';
            document.body.appendChild(c);
        }
        return c;
    }

    function showToast(message, opts) {
        if (!message) return;
        const container = ensureContainer();
        const toast = document.createElement('div');
        toast.className = 'site-toast';
        toast.textContent = message;
        toast.style.minWidth = '220px';
        toast.style.maxWidth = '90vw';
        toast.style.background = 'rgba(0,0,0,0.85)';
        toast.style.color = '#fff';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
        toast.style.fontWeight = '600';
        toast.style.textAlign = 'center';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
        toast.style.transform = 'translateY(-6px)';

        // close on click
        toast.addEventListener('click', () => {
            hideToast(toast);
        });

        container.appendChild(toast);
        // entrance
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        const timeout = (opts && opts.timeout) || 4000;
        toast._timeoutId = setTimeout(() => hideToast(toast), timeout);

        return toast;
    }

    function hideToast(toast) {
        if (!toast) return;
        clearTimeout(toast._timeoutId);
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-6px)';
        setTimeout(() => {
            toast.remove();
        }, 220);
    }

    // Observe message elements and show toast when their text changes to non-empty
    function observeMessageSelector(selector) {
        try {
            const el = document.querySelector(selector);
            if (!el) return;
            // show immediately if already has content
            const textNow = (el.textContent || '').trim();
            if (textNow) showToast(textNow);

            const mo = new MutationObserver(mutations => {
                for (const m of mutations) {
                    if (m.type === 'characterData') {
                        const val = (m.target.data || '').trim();
                        if (val) showToast(val);
                    } else if (m.type === 'childList') {
                        const val = (el.textContent || '').trim();
                        if (val) showToast(val);
                    }
                }
            });

            mo.observe(el, { characterData: true, subtree: true, childList: true });
        } catch (e) {
            console.warn('toast observe failed', e);
        }
    }

    // Expose globally
    window.siteToast = { show: showToast };

// on DOM ready, attach to common message elements
function attach() {
    observeMessageSelector('#login-message');
    observeMessageSelector('#register-message');
    observeMessageSelector('.register-message');
    observeMessageSelector('.login-message');
    observeMessageSelector('#address-message');

    // Do not force root-level overflow changes here — leave scrolling to page CSS/HTML.
    // For some pages we used to hide root scrollbars here; that prevented desktop scrolling.
    // If a future component needs to disable scrolling (e.g. modal), handle it locally there.
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
else attach();
}) ();
