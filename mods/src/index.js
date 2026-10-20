/**
 * index.js
 * Haupt-Entrypoint für das injizierte TizenBrew AniWorld TV Modul.
 * Koordiniert Initialisierung, Module und Lifecycle-Cleanup.
 */

import { APP_CONFIG } from "./constants.js";
import { Logger } from "./logger.js";
import { injectFocusStyles, removeFocusStyles } from "./focusRing.js";
import { initDomEnhancer, cleanupDomEnhancer } from "./domEnhancer.js";
import { initMenuController, cleanupMenuController } from "./menuController.js";
import { initBackButton, cleanupBackButton } from "./backButton.js";
import { initSpatialNav, cleanupSpatialNav } from "./spatialNav.js";

(() => {
  window.SCRIPT_VERSION = APP_CONFIG.VERSION;

  function init() {
    if (window.__ANIWORLD_INITIALIZED__) {
      Logger.warn("Bereits initialisiert.");
      return;
    }

    try {
      Logger.info(`Initialisiere ${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}...`);

      // 1. High-Visibility Fokus-Styles injizieren
      injectFocusStyles();

      // 2. DOM-Elemente augmentieren (Tabindex für Karussell & Buttons)
      initDomEnhancer();

      // 3. Dropdown- und Menüsteuerung aktivieren
      initMenuController();

      // 4. Zurück-Taste (Tizen HW Key & History) einrichten
      initBackButton();

      // 5. W3C Spatial Navigation starten
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
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 300), {
      once: true,
    });
  } else {
    setTimeout(init, 300);
  }

  // Fallback-Start falls DOMContentLoaded auf älteren Tizen-Versionen ausbleibt
  setTimeout(() => {
    if (!window.__ANIWORLD_INITIALIZED__) {
      init();
    }
  }, 3000);
})();

