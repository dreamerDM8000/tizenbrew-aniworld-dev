import "./cursor.js";
import "./aniworld_navigation.js";

(function () {
  window.SCRIPT_VERSION = "1.0.16";
  console.log(SCRIPT_VERSION);

  if (window.__ANIWORLD_NAV_INITIALIZED__) {
    console.log("Navigation bereits initialisiert");
    return;
  }

  window.__ANIWORLD_NAV_INITIALIZED__ = true;

  function init() {
    window.addEventListener("keydown", function (e) {
      if (e.keyCode === 10009) {
        if (window.history.length > 1) {
          window.history.back();
        } else if (typeof tizen !== "undefined") {
          SN.uninit();
          tizen.application.getCurrentApplication().exit();
        }
      }
    });

    document.querySelectorAll("a[target='_blank']").forEach((a) => {
      a.removeAttribute("target");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init());
  } else {
    init();
  }
})();
