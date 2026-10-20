/**
 * index.js
 * Haupt-Entrypoint für das injizierte TizenBrew AniWorld TV Modul.
 * Koordiniert Initialisierung, Module, VirtualCursor und Lifecycle-Cleanup.
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
import { initVirtualCursor, cleanupVirtualCursor } from "./virtualCursor.js";

(() => {
  const hostname = window.location.hostname;
  if (!hostname || !hostname.includes("aniworld.to")) {
    return;
  }

  window.SCRIPT_VERSION = APP_CONFIG.VERSION;

  function init() {
    if (!window.location.hostname.includes("aniworld.to")) {
      return;
    }

    if (window.__ANIWORLD_INITIALIZED__) {
      Logger.warn("Bereits initialisiert.");
      return;
    }

    try {
      Logger.info(`Initialisiere ${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}...`);

      // 1. Popup- & Tab-Schutz (Verhindert neue Tabs und Werbe-Redirects)
      initAdBlocker();

      // 2. High-Visibility Fokus-Styles injizieren (Header containment)
      injectFocusStyles();

      // 3. DOM-Elemente augmentieren (Tabindex & target="_blank" Bereinigung)
      initDomEnhancer();

      // 4. Dropdown- und Menüsteuerung aktivieren
      initMenuController();

      // 5. Virtuellen Mauszeiger bereitstellen (Rote Taste)
      initVirtualCursor();

      // 6. Zurück-Taste (Tizen HW Key, Cursor & Root-Exit) einrichten
      initBackButton();

      // 7. W3C Spatial Navigation starten (inkl. Header-Brücke zum User-Profil)
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
      cleanupVirtualCursor();
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 150), {
      once: true,
    });
  } else {
    setTimeout(init, 150);
  }

  setTimeout(() => {
    if (!window.__ANIWORLD_INITIALIZED__) {
      init();
    }
  }, 2000);
})();
