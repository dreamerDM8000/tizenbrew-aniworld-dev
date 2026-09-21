(() => {
  const CDN =
    "https://raw.githubusercontent.com/dreamerDM8000/tizenbrew-aniworld-dev/refs/heads/main/dist/userScript.js";

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

    setTimeout(() => {
      toast.style.opacity = "0";

      setTimeout(() => {
        toast.remove();
      }, 1000);
    }, 3000);
  }

  function getVersion(code) {
    const match = code.match(/window\.SCRIPT_VERSION\s*=\s*["']([^"']+)["']/);

    return match ? match[1] : "unbekannt";
  }

  function cleanup() {
    if (typeof window.__ANIWORLD_UNINIT__ === "function") {
      try {
        window.__ANIWORLD_UNINIT__();
      } catch (e) {
        console.error("[AniWorld Loader] Cleanup-Fehler:", e);
      }
    }
  }

  // Bereits innerhalb dieser Website geladen?
  if (sessionStorage.getItem(SESSION_KEY)) {
    const cached = localStorage.getItem(CACHE_KEY);

    if (cached) {
      run(cached);
    }

    return;
  }

  // Website verlassen → Script aufräumen
  window.addEventListener("pagehide", cleanup, { once: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  // Erstmaliger Start → CDN laden
  fetch(CDN + "?t=" + Date.now(), {
    cache: "no-store",
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      return res.text();
    })
    .then((code) => {
      localStorage.setItem(CACHE_KEY, code);

      // Erst jetzt markieren:
      // Diese Website-Session hat das Script geladen.
      sessionStorage.setItem(SESSION_KEY, "1");

      run(code);

      setTimeout(() => {
        showToast("AniWorld Script v" + getVersion(code) + " geladen");
      }, 500);
    })
    .catch(() => {
      const cached = localStorage.getItem(CACHE_KEY);

      if (cached) {
        sessionStorage.setItem(SESSION_KEY, "1");

        run(cached);

        setTimeout(() => {
          showToast(
            "AniWorld Script v" + getVersion(cached) + " (Offline-Cache)",
          );
        }, 500);
      } else {
        console.error("[AniWorld Loader] Offline und kein Cache!");
      }
    });
})();
