import "./cursor.js";
import "./keylogger.js";

(() => {
  window.SCRIPT_VERSION = "1.0.10";

  let tizenHwKeyHandler = null;
  let clickHandler = null;
  let elementObserver = null;

  function removeBlockedElements() {
    document
      .querySelectorAll("iframe, a[target='_blank']")
      .forEach((element) => {
        element.remove();
      });
  }

  function init() {
    if (window.__ANIWORLD_NAV_INITIALIZED__) {
      return;
    }

    // Bereits vorhandene Elemente entfernen
    removeBlockedElements();

    // Neu eingefügte Elemente automatisch entfernen
    elementObserver = new MutationObserver(() => {
      removeBlockedElements();
    });

    if (document.documentElement) {
      elementObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }

    // Tizen Zurück-Taste
    tizenHwKeyHandler = function (e) {
      if (e.keyName === "back") {
        if (window.history.length > 1) {
          window.history.back();
        } else if (typeof tizen !== "undefined") {
          tizen.application.getCurrentApplication().exit();
        }
      }
    };

    // target="_blank" abfangen
    clickHandler = function (e) {
      const a = e.target.closest("a[target='_blank']");

      if (!a) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      window.location.href = a.href;
    };

    window.addEventListener("tizenhwkey", tizenHwKeyHandler);

    document.addEventListener("click", clickHandler, true);

    window.__ANIWORLD_NAV_INITIALIZED__ = true;
  }

  function uninit() {
    if (!window.__ANIWORLD_NAV_INITIALIZED__) {
      return;
    }

    if (tizenHwKeyHandler) {
      window.removeEventListener("tizenhwkey", tizenHwKeyHandler);
      tizenHwKeyHandler = null;
    }

    if (clickHandler) {
      document.removeEventListener("click", clickHandler, true);
      clickHandler = null;
    }

    if (elementObserver) {
      elementObserver.disconnect();
      elementObserver = null;
    }

    window.__ANIWORLD_NAV_INITIALIZED__ = false;
  }

  window.__ANIWORLD_INIT__ = init;
  window.__ANIWORLD_UNINIT__ = uninit;

  function waitForPage() {
    if (window.__ANIWORLD_NAV_INITIALIZED__) {
      return;
    }

    if (document.readyState === "loading") {
      window.addEventListener(
        "DOMContentLoaded",
        () => {
          setTimeout(init, 500);
        },
        { once: true },
      );
    } else {
      setTimeout(init, 500);
    }

    // Fallback für den Fall, dass DOMContentLoaded
    // auf dem TV nicht zuverlässig ausgelöst wird.
    setTimeout(() => {
      if (!window.__ANIWORLD_NAV_INITIALIZED__) {
        init();
      }
    }, 10000);
  }

  waitForPage();
})();
