/**
 * spatialNav.js
 * Anbindung des W3C Spatial Navigation Polyfills mit Fokus auf maximale TV-Performance.
 * Nutzt das interne Caching des Polyfills ohne redundante Layout-Berechnungen.
 */

// Importiert das unveränderte W3C Polyfill
import "../spatial-navigation-polyfill.js";

import { KEY_CODES } from "./constants.js";
import { Logger } from "./logger.js";

let enterKeyHandler = null;

/**
 * Setzt den Anfangsfokus schnell auf das erste sichtbare Hauptelement.
 */
export function setInitialFocus() {
  try {
    if (
      document.activeElement &&
      document.activeElement !== document.body &&
      document.activeElement !== document.documentElement
    ) {
      return;
    }

    const candidate =
      document.querySelector(".primary-navigation a") ||
      document.querySelector(".coverListItem a") ||
      document.querySelector(".homeContentPromotionBoxPicture a") ||
      document.querySelector("a[href]");

    if (candidate && typeof candidate.focus === "function") {
      candidate.focus();
      Logger.info("Initialer TV-Fokus gesetzt auf:", candidate);
    }
  } catch (e) {
    Logger.warn("Konnte initialen Fokus nicht setzen:", e);
  }
}

/**
 * Initialisiert die Spatial Navigation.
 */
export function initSpatialNav() {
  // Polyfill-Tastenmodus aktivieren
  if (window.__spatialNavigation__) {
    try {
      window.__spatialNavigation__.keyMode = "ARROW";
    } catch (e) {}
  }

  // 1. Polyfill-Load-Event triggern, damit spatialNavigationHandler() sofort aktiv wird
  // und sein internes Bounding-Box-Caching (mapOfBoundRect) aktiviert.
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    try {
      window.dispatchEvent(new Event("load"));
    } catch (e) {}
  }

  // 2. Schlanker Enter-Key-Handler für Nicht-Standard-Buttons (z. B. Karussell-Pfeile span[data-action])
  enterKeyHandler = (event) => {
    if (event.keyCode === KEY_CODES.ENTER || event.key === "Enter") {
      const active = document.activeElement;
      if (
        active &&
        active !== document.body &&
        active.tagName !== "INPUT" &&
        active.tagName !== "TEXTAREA"
      ) {
        if (active.tagName !== "A" && active.tagName !== "BUTTON") {
          active.click();
          event.preventDefault();
        }
      }
    }
  };

  window.addEventListener("keydown", enterKeyHandler, true);

  // Initialen Fokus setzen (kurzer Delay für DOM-Bereitschaft)
  setTimeout(setInitialFocus, 250);

  Logger.info("Spatial Navigation (Performance-optimiert) aktiv.");
}

export function cleanupSpatialNav() {
  if (enterKeyHandler) {
    window.removeEventListener("keydown", enterKeyHandler, true);
    enterKeyHandler = null;
  }

  // Polyfill vollständig deaktivieren, damit nach Verlassen des Moduls keine Pfeiltasten abgefangen werden
  if (window.__spatialNavigation__) {
    try {
      window.__spatialNavigation__.keyMode = "NONE";
    } catch (e) {}
  }

  Logger.info("Spatial Navigation aufgeräumt und deaktiviert.");
}
