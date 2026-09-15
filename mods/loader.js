(function () {
  const CDN =
    "https://raw.githubusercontent.com/dreamerDM8000/tizenbrew-aniworld/refs/heads/main/dist/userScript.js";
  const CACHE_KEY = "aniworld_script_cache";
  const SESSION_KEY = "aniworld_loaded";

  function run(code) {
    try {
      new Function(code)();
    } catch (e) {
      console.error("[AniWorld Loader] Fehler:", e);
    }
  }

  function showToast(msg) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.style.cssText = [
      "position: fixed",
      "bottom: 40px",
      "left: 50%",
      "transform: translateX(-50%)",
      "background: #FF6600",
      "color: #fff",
      "padding: 10px 24px",
      "border-radius: 8px",
      "font-size: 20px",
      "z-index: 999999",
      "opacity: 1",
      "transition: opacity 1s ease",
    ].join(";");

    document.body.appendChild(toast);

    // Nach 3 Sekunden ausblenden
    setTimeout(function () {
      toast.style.opacity = "0";
      setTimeout(function () {
        toast.remove();
      }, 1000);
    }, 3000);
  }

  function getVersion() {
    return window.SCRIPT_VERSION || "unbekannt";
  }

  if (sessionStorage.getItem(SESSION_KEY)) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) run(cached);
    return;
  }

  fetch(CDN + "?t=" + Date.now(), {
    cache: "no-store",
  })
    .then(function (res) {
      return res.text();
    })
    .then(function (code) {
      localStorage.setItem(CACHE_KEY, code);
      sessionStorage.setItem(SESSION_KEY, "1");
      run(code);
      // Toast erst nach run() damit document.body existiert
      setTimeout(function () {
        showToast("AniWorld Script v" + getVersion(code) + " geladen");
      }, 500);
    })
    .catch(function () {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        run(cached);
        setTimeout(function () {
          showToast(
            "AniWorld Script v" + getVersion(cached) + " (Offline-Cache)",
          );
        }, 500);
      } else {
        console.error("[AniWorld Loader] Offline und kein Cache!");
      }
    });
})();
