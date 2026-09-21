import "./adblock.js";
import "./cursor.js";
import "./aniworld_navigation.js";
import "./keylogger.js";

(() => {
  window.SCRIPT_VERSION = "1.0.8";

  function init() {
    // Nur einmal initialisieren
    if (window.__ANIWORLD_NAV_INITIALIZED__) {
      return;
    }

    window.__ANIWORLD_NAV_INITIALIZED__ = true;

    window.addEventListener("tizenhwkey", function (e) {
      if (e.keyName === "back") {
        if (window.history.length > 1) {
          window.history.back();
        } else if (typeof tizen !== "undefined") {
          tizen.application.getCurrentApplication().exit();
        }
      }
    });

    document.addEventListener(
      "click",
      function (e) {
        const a = e.target.closest("a[target='_blank']");

        if (!a) return;

        e.preventDefault();
        e.stopPropagation();

        window.location.href = a.href;
      },
      true,
    );
  }

  function waitForPage() {
    if (window.__ANIWORLD_NAV_INITIALIZED__) {
      return;
    }

    if (document.readyState === "complete") {
      init();
      return;
    }

    // Warten, bis die Seite vollständig geladen wurde
    window.addEventListener("load", init, { once: true });

    // Fallback für den Fall, dass Tizen/Browser das load-Event
    // nicht zuverlässig auslöst.
    setTimeout(() => {
      if (!window.__ANIWORLD_NAV_INITIALIZED__) {
        init();
      }
    }, 10000);
  }

  waitForPage();
})();
