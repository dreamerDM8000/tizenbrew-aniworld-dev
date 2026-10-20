/**
 * loader.js
 * TizenBrew Script Injection Loader für AniWorld.
 *
 * SICHERHEIT:
 * Läuft ausschließlich auf aniworld.to!
 * Sobald die Startseite per Back verlassen wird und der TV zu TizenBrew zurückkehrt,
 * wird die Ausführung sofort beendet und der Speicher vollständig freigegeben.
 */

(() => {
  // 1. Strikte Domain-Prüfung: Das Skript darf NUR auf aniworld.to ausgeführt werden!
  const hostname = window.location.hostname;
  if (!hostname || !hostname.includes("aniworld.to")) {
    return;
  }

  const CDN_URL =
    "https://raw.githubusercontent.com/dreamerDM8000/tizenbrew-aniworld-dev/refs/heads/main/dist/userScript.js";

  const CACHE_KEY = "aniworld_script_cache";
  const SESSION_KEY = "aniworld_loaded";

  function runScript(code) {
    // Vor Ausführung nochmals Domain prüfen
    if (!window.location.hostname.includes("aniworld.to")) {
      return;
    }

    try {
      new Function(code)();
    } catch (error) {
      console.error("[AniWorld Loader] Fehler beim Ausführen des Scripts:", error);
    }
  }

  function showTvToast(message) {
    if (!window.location.hostname.includes("aniworld.to")) {
      return;
    }

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
        "padding: 10px 24px",
        "border-radius: 6px",
        "font-size: 19px",
        "font-weight: bold",
        "z-index: 2147483647",
        "opacity: 1",
        "transition: opacity 0.6s ease",
        "pointer-events: none",
        "box-shadow: 0 4px 12px rgba(0,0,0,0.5)",
      ].join(";");

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 600);
      }, 3000);
    } catch (e) {
      // Stilles Abfangen
    }
  }

  function extractVersion(code) {
    if (!code) return "1.0.6";
    const match = code.match(/(?:window\.SCRIPT_VERSION\s*=\s*|VERSION:\s*)["']([^"']+)["']/);
    if (match && match[1]) {
      return match[1];
    }
    const numMatch = code.match(/["'](\d+\.\d+\.\d+)["']/);
    return numMatch ? numMatch[1] : "1.0.6";
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
      }, 400);
    })
    .catch((fetchError) => {
      console.warn("[AniWorld Loader] CDN nicht erreichbar, nutze Offline-Cache:", fetchError);
      const cachedCode = localStorage.getItem(CACHE_KEY);

      if (cachedCode) {
        sessionStorage.setItem(SESSION_KEY, "1");
        runScript(cachedCode);

        setTimeout(() => {
          showTvToast(`AniWorld TV v${extractVersion(cachedCode)} (Offline-Cache)`);
        }, 400);
      } else {
        console.error("[AniWorld Loader] Weder CDN noch lokaler Cache verfügbar!");
      }
    });
})();
