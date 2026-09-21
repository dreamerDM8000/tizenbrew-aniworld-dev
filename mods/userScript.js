import "./adblock.js";
import "./cursor.js";
import "./aniworld_navigation.js";
import "./keylogger.js";

(function () {
  window.SCRIPT_VERSION = "1.0.7";
  console.log(SCRIPT_VERSION);

  if (window.__ANIWORLD_NAV_INITIALIZED__) {
    console.log("Navigation bereits initialisiert");
    return;
  }

  window.__ANIWORLD_NAV_INITIALIZED__ = true;

  function init() {
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

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, { once: true });
  }
})();
