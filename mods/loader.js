/**
 * loader.js
 * TizenBrew Script Injection Loader für AniWorld.
 *
 * Lädt das aktuelle Bundle via CDN (mit Offline-Cache im localStorage)
 * und injiziert es in die laufende AniWorld-Webansicht auf dem Samsung TV.
 */

(() => {
  const CDN_URL =
    "https://raw.githubusercontent.com/dreamerDM8000/tizenbrew-aniworld-dev/refs/heads/main/dist/userScript.js";

  const CACHE_KEY = "aniworld_script_cache";
  const SESSION_KEY = "aniworld_loaded";

  function runScript(code) {
    try {
      new Function(code)();
    } catch (error) {
      console.error("[AniWorld Loader] Fehler beim Ausführen des Scripts:", error);
    }
  }

  function showTvToast(message) {
    try {
      const existing = document.getElementById("aniworld-loader-toast");
      if (existing) {
        existing.remove();
      }

      const toast = document.createElement("div");
      toast.id = "aniworld-loader-toast";
      toast.textContent = message;

      toast.style.cssText = [
        "position: fixed",
        "bottom: 35px",
        "left: 50%",
        "transform: translateX(-50%)",
        "background: #FF6600",
        "color: #FFFFFF",
        "padding: 12px 28px",
        "border-radius: 8px",
        "font-size: 20px",
        "font-weight: bold",
        "box-shadow: 0 4px 14px rgba(0,0,0,0.6)",
        "z-index: 2147483647",
        "opacity: 1",
        "transition: opacity 0.8s ease",
        "pointer-events: none",
      ].join(";");

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 800);
      }, 3000);
    } catch (e) {
      // Stilles Abfangen falls body noch nicht existiert
    }
  }

  function extractVersion(code) {
    const match = code.match(/window\.SCRIPT_VERSION\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : "unbekannt";
  }

  function handleCleanup() {
    if (typeof window.__ANIWORLD_UNINIT__ === "function") {
      try {
        window.__ANIWORLD_UNINIT__();
      } catch (e) {
        console.error("[AniWorld Loader] Fehler beim Cleanup:", e);
      }
    }
  }

  // Falls in dieser Sitzung bereits geladen -> direkt aus Cache ausführen
  if (sessionStorage.getItem(SESSION_KEY)) {
    const cachedCode = localStorage.getItem(CACHE_KEY);
    if (cachedCode) {
      runScript(cachedCode);
    }
    return;
  }

  // Lifecycle-Events für saubere Speicherbereinigung auf dem Fernseher
  window.addEventListener("pagehide", handleCleanup, { once: true });
  window.addEventListener("beforeunload", handleCleanup, { once: true });

  // Erststart: Neuestes Script vom CDN abrufen
  fetch(`${CDN_URL}?t=${Date.now()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    })
    .then((code) => {
      localStorage.setItem(CACHE_KEY, code);
      sessionStorage.setItem(SESSION_KEY, "1");

      runScript(code);

      setTimeout(() => {
        showTvToast(`AniWorld TV v${extractVersion(code)} geladen`);
      }, 500);
    })
    .catch((fetchError) => {
      console.warn("[AniWorld Loader] CDN nicht erreichbar, nutze Cache:", fetchError);
      const cachedCode = localStorage.getItem(CACHE_KEY);

      if (cachedCode) {
        sessionStorage.setItem(SESSION_KEY, "1");
        runScript(cachedCode);

        setTimeout(() => {
          showTvToast(`AniWorld TV v${extractVersion(cachedCode)} (Offline-Cache)`);
        }, 500);
      } else {
        console.error("[AniWorld Loader] Weder CDN noch lokaler Cache verfügbar!");
      }
    });
})();
