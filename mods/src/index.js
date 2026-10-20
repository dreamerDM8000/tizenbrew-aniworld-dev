/**
 * index.js
 * Haupt-Entrypoint für das injizierte TizenBrew AniWorld TV Modul.
 * Koordiniert Initialisierung, Module und Lifecycle-Cleanup.
 *
 * SICHERHEIT: Läuft ausschließlich auf aniworld.to!
 */

import { APP_CONFIG } from "./constants.js";
import { Logger } from "./logger.js";
import { injectFocusStyles, removeFocusStyles } from "./focusRing.js";
import { initDomEnhancer, cleanupDomEnhancer } from "./domEnhancer.js";
import { initMenuController, cleanupMenuController } from "./menuController.js";
import { initBackButton, cleanupBackButton } from "./backButton.js";
import { initSpatialNav, cleanupSpatialNav } from "./spatialNav.js";
import { initAdBlocker, cleanupAdBlocker } from "./adBlocker.js";

(() => {
  // Strikte Domain-Prüfung: Das Skript darf NUR auf aniworld.to ausgeführt werden!
  // Sobald der Nutzer zurück in TizenBrew oder auf einer anderen URL ist, bricht das Skript sofort ab.
  const hostname = window.location.hostname;
  if (!hostname || !hostname.includes("aniworld.to")) {
    return;
  }

  window.SCRIPT_VERSION = APP_CONFIG.VERSION;

  function init() {
    // Erneute Prüfung vor Initialisierung
    if (!window.location.hostname.includes("aniworld.to")) {
      return;
    }

    if (window.__ANIWORLD_INITIALIZED__) {
      Logger.warn("Bereits initialisiert.");
      return;
    }

    try {
      Logger.info(`Initialisiere ${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}...`);

      // 1. Popup- & Werbe-Schutz (besonders für Video-Playback)
      initAdBlocker();

      // 2. High-Visibility Fokus-Styles injizieren (performance-optimiert)
      injectFocusStyles();

      // 3. DOM-Elemente augmentieren (Tabindex für Karussell & Buttons)
      initDomEnhancer();

      // 4. Dropdown- und Menüsteuerung aktivieren
      initMenuController();

      // 5. Zurück-Taste (Tizen HW Key & History) einrichten
      initBackButton();

      // 6. W3C Spatial Navigation starten
      initSpatialNav();

      window.__ANIWORLD_INITIALIZED__ = true;
      Logger.info(`${APP_CONFIG.NAME} erfolgreich gestartet.`);
    } catch (error) {
      Logger.error("Kritischer Fehler bei der Initialisierung:", error);
    }
  }

  function uninit() {
    if (!window.__ANIWORLD_INITIALIZED__) {
      return;
    }

    try {
      Logger.info(`Beende ${APP_CONFIG.NAME}...`);

      cleanupSpatialNav();
      cleanupBackButton();
      cleanupMenuController();
      cleanupDomEnhancer();
      cleanupAdBlocker();
      removeFocusStyles();

      window.__ANIWORLD_INITIALIZED__ = false;
      Logger.info(`${APP_CONFIG.NAME} vollständig aufgeräumt.`);
    } catch (error) {
      Logger.error("Fehler beim Cleanup:", error);
    }
  }

  // Globale Lifecycle-Hooks für den TizenBrew Loader
  window.__ANIWORLD_INIT__ = init;
  window.__ANIWORLD_UNINIT__ = uninit;

  // Warten bis DOM bereit ist
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 150), {
      once: true,
    });
  } else {
    setTimeout(init, 150);
  }

  // Fallback-Start falls DOMContentLoaded auf älteren Tizen-Versionen ausbleibt
  setTimeout(() => {
    if (!window.__ANIWORLD_INITIALIZED__) {
      init();
    }
  }, 2000);
})();
