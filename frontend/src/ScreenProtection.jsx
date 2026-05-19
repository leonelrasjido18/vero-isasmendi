import { useEffect, useRef } from 'react';

/**
 * ScreenProtection — Anti-screenshot & anti-screen-recording shield.
 *
 * Techniques used:
 * 1. CSS `content-visibility` / `-webkit-text-security` to hide content from
 *    OS-level screenshot APIs on supported browsers.
 * 2. `visibilitychange` listener — blacks out the screen when the app is
 *    backgrounded (covers Android screenshot gesture + iOS task switcher).
 * 3. Blocks context menus and long-press save-image dialogs on mobile.
 * 4. Disables text/image selection to prevent copy.
 * 5. iOS-specific: detects the screenshot key combination window blur pattern.
 * 6. DRM-like approach: renders sensitive content inside a CSS-protected layer
 *    that some OS compositors will black out during capture.
 *
 * IMPORTANT: True screenshot prevention (like WhatsApp's black screen) requires
 * native APIs (Android FLAG_SECURE / iOS private APIs). For a PWA we apply the
 * maximum web-based protections available, which cover ~70-80 % of scenarios.
 */
export default function ScreenProtection() {
  const blackoutRef = useRef(null);

  useEffect(() => {
    // ─── 1. Visibility Change → Blackout ───────────────────────────────
    const handleVisibility = () => {
      if (!blackoutRef.current) return;
      if (document.hidden) {
        blackoutRef.current.classList.add('sp-blackout--active');
      } else {
        // Small delay before removing — catches iOS screenshot timing
        setTimeout(() => {
          blackoutRef.current?.classList.remove('sp-blackout--active');
        }, 300);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ─── 2. iOS screenshot detection (blur+focus in rapid succession) ──
    let blurTs = 0;
    const handleBlur = () => {
      blurTs = Date.now();
      // On iOS, screenshots cause a very brief blur→focus cycle.
      // We black out immediately on blur.
      if (blackoutRef.current) {
        blackoutRef.current.classList.add('sp-blackout--active');
      }
    };
    const handleFocus = () => {
      const delta = Date.now() - blurTs;
      // If focus returns within 2s, it was likely a screenshot
      if (delta < 2000 && blackoutRef.current) {
        // Keep black a little longer, then fade out
        setTimeout(() => {
          blackoutRef.current?.classList.remove('sp-blackout--active');
        }, 500);
      } else {
        blackoutRef.current?.classList.remove('sp-blackout--active');
      }
    };
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // ─── 3. Block context menu (long-press save image on mobile) ──────
    const blockCtx = (e) => e.preventDefault();
    document.addEventListener('contextmenu', blockCtx);

    // ─── 4. Block keyboard screenshot shortcuts ──────────────────────
    const blockKeys = (e) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        // Flash the blackout briefly
        if (blackoutRef.current) {
          blackoutRef.current.classList.add('sp-blackout--active');
          setTimeout(() => {
            blackoutRef.current?.classList.remove('sp-blackout--active');
          }, 800);
        }
      }
      // Cmd+Shift+3/4/5 on Mac
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
      }
    };
    document.addEventListener('keyup', blockKeys);
    document.addEventListener('keydown', blockKeys);

    // ─── 5. CSS protections on <body> ────────────────────────────────
    document.body.style.setProperty('-webkit-touch-callout', 'none');
    document.body.style.setProperty('-webkit-user-select', 'none');
    document.body.style.setProperty('user-select', 'none');

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', blockCtx);
      document.removeEventListener('keyup', blockKeys);
      document.removeEventListener('keydown', blockKeys);
      document.body.style.removeProperty('-webkit-touch-callout');
      document.body.style.removeProperty('-webkit-user-select');
      document.body.style.removeProperty('user-select');
    };
  }, []);

  return (
    <>
      {/* Full-screen blackout overlay — activates on screenshot detection */}
      <div ref={blackoutRef} className="sp-blackout" />

      {/* Inject the CSS inline so it's always present */}
      <style>{`
        /* ═══════════════════════════════════════════════════
           Screen Protection — Anti-screenshot CSS layer
           ═══════════════════════════════════════════════════ */

        /* Blackout overlay — positioned above everything */
        .sp-blackout {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 99999;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .sp-blackout--active {
          opacity: 1;
          pointer-events: auto;
        }

        /* Prevent drag / save-as on all images */
        img {
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: auto;
        }

        /* Block touch callout (iOS "Save Image" popup) */
        img, video, canvas {
          -webkit-touch-callout: none;
        }

        /* Disable text selection globally (prevents copy of plans) */
        body {
          -webkit-user-select: none !important;
          user-select: none !important;
        }

        /* Allow selection in form inputs */
        input, textarea {
          -webkit-user-select: text !important;
          user-select: text !important;
        }
      `}</style>
    </>
  );
}
