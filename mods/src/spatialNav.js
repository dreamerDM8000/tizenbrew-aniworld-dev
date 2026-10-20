/**
 * spatialNav.js
 * Bindet das offizielle W3C Spatial Navigation Polyfill ein, stellt sicher,
 * dass Key-Events korrekt verarbeitet werden und setzt den initialen Fokus auf TV.
 */

// Importiert das unveränderte W3C Polyfill
import "../spatial-navigation-polyfill.js";

import { KEY_CODES } from "./constants.js";
import { Logger } from "./logger.js";

let keydownFallbackHandler = null;
let focusChangeHandler = null;

const ARROW_DIRECTIONS = {
  [KEY_CODES.ARROW_LEFT]: "left",
  [KEY_CODES.ARROW_UP]: "up",
  [KEY_CODES.ARROW_RIGHT]: "right",
  [KEY_CODES.ARROW_DOWN]: "down",
  ArrowLeft: "left",
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
};

/**
 * Setzt den Anfangsfokus auf das erste sinnvolle Element der Seite.
 */
export function setInitialFocus() {
  try {
    // Falls bereits ein Element fokussiert ist (außer body/html)
    if (document.activeElement && document.activeElement !== document.body && document.activeElement !== document.documentElement) {
      return;
    }

    // Bevorzugt erste Navigationsverlinkung oder erstes Anime-Cover
    const candidate =
      document.querySelector(".primary-navigation a") ||
      document.querySelector(".homeContentPromotionBoxPicture a") ||
      document.querySelector(".coverListItem a") ||
      document.querySelector("a[href]");

    if (candidate && typeof candidate.focus === "function") {
      candidate.focus();
      Logger.info("Initialer Fokus gesetzt auf:", candidate);
    }
  } catch (e) {
    Logger.warn("Konnte initialen Fokus nicht setzen:", e);
  }
}

/**
 * Initialisiert die Spatial Navigation und Event-Listener.
 */
export function initSpatialNav() {
  // Falls die Seite schon vollständig geladen war, bevor das Skript injiziert wurde:
  // Polyfill-Load-Event triggern, damit spatialNavigationHandler() aktiv wird.
  if (document.readyState === "complete") {
    try {
      window.dispatchEvent(new Event("load"));
    } catch (e) {
      // Ignorieren falls nicht erlaubt
    }
  }

  // Fallback-Navigation & Enter-Key-Handling für Nicht-Standard-Elemente (z.B. div/span-Buttons)
  keydownFallbackHandler = (event) => {
    // 1. Enter-Taste: Klick auf aktives Element auslösen (z. B. Karussell-Pfeile, Dropdown-Header)
    if (event.keyCode === KEY_CODES.ENTER || event.key === "Enter") {
      const active = document.activeElement;
      if (active && active !== document.body && active.tagName !== "INPUT" && active.tagName !== "TEXTAREA") {
        // Bei Buttons und Links führt der Browser Enter oft nativ aus, bei div/span nicht
        if (active.tagName !== "A" && active.tagName !== "BUTTON") {
          active.click();
          event.preventDefault();
        }
      }
      return;
    }

    // 2. Richtungstasten: Falls das Polyfill-Event noch nicht gegriffen hat
    const direction = ARROW_DIRECTIONS[event.keyCode] || ARROW_DIRECTIONS[event.key];
    if (direction && typeof window.navigate === "function") {
      // Wenn das Event noch nicht abgefangen wurde
      if (!event.defaultPrevented) {
        event.preventDefault();
        window.navigate(direction);
      }
    }
  };

  // Scrollt das fokussierte Element automatisch mittig ins Sichtfeld (TV 10-Foot UI)
  focusChangeHandler = (event) => {
    const target = event.target;
    if (target && target instanceof Element && target !== document.body) {
      try {
        target.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      } catch (e) {
        // Fallback
      }
    }
  };

  window.addEventListener("keydown", keydownFallbackHandler, true);
  window.addEventListener("focusin", focusChangeHandler, true);

  // Initialen Fokus mit kurzem Delay setzen, damit das DOM bereit ist
  setTimeout(setInitialFocus, 400);

  Logger.info("Spatial Navigation erfolgreich initialisiert.");
}

/**
 * Bereinigt die Event-Listener der Spatial Navigation.
 */
export function cleanupSpatialNav() {
  if (keydownFallbackHandler) {
    window.removeEventListener("keydown", keydownFallbackHandler, true);
    keydownFallbackHandler = null;
  }

  if (focusChangeHandler) {
    window.removeEventListener("focusin", focusChangeHandler, true);
    focusChangeHandler = null;
  }

  Logger.info("Spatial Navigation aufgeräumt.");
}

