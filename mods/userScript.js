import "./adblock.js";
import "./cursor.js";
import "./aniworld_navigation.js";
import "./keylogger.js";

(() => {
  window.SCRIPT_VERSION = "1.0.8";

  let tizenHwKeyHandler = null;
  let clickHandler = null;

  function init() {
    if (window.__ANIWORLD_NAV_INITIALIZED__) {
      return;
    }

    tizenHwKeyHandler = function (e) {
      if (e.keyName === "back") {
        if (window.history.length > 1) {
          window.history.back();
        } else if (typeof tizen !== "undefined") {
          tizen.application.getCurrentApplication().exit();
        }
      }
    };

    clickHandler = function (e) {
      const a = e.target.closest("a[target='_blank']");

      if (!a) return;

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

    window.__ANIWORLD_NAV_INITIALIZED__ = false;
  }

  window.__ANIWORLD_INIT__ = init;
  window.__ANIWORLD_UNINIT__ = uninit;

  function waitForPage() {
    if (window.__ANIWORLD_NAV_INITIALIZED__) {
      return;
    }

    if (document.readyState === "complete") {
      init();
      return;
    }

    window.addEventListener("load", init, { once: true });

    setTimeout(() => {
      if (!window.__ANIWORLD_NAV_INITIALIZED__) {
        init();
      }
    }, 10000);
  }

  waitForPage();
})();
