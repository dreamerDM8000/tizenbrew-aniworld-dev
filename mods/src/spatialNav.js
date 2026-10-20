/**
 * spatialNav.js
 * Anbindung des W3C Spatial Navigation Polyfills mit Fokus auf maximale TV-Performance.
 * Beinhaltet eine direkte Brücke im Header, um zuverlässig zum Benutzerprofil (.dd / .avatar) zu navigieren.
 */

// Importiert das unveränderte W3C Polyfill
import "../spatial-navigation-polyfill.js";

import { APP_CONFIG, KEY_CODES } from "./constants.js";
import { Logger } from "./logger.js";
import { isCursorActive } from "./virtualCursor.js";

let enterKeyHandler = null;
let directionalBridgeHandler = null;

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
 * Initialisiert die Spatial Navigation und Header-Navigations-Brücken.
 */
export function initSpatialNav() {
  if (window.__spatialNavigation__) {
    try {
      window.__spatialNavigation__.keyMode = "ARROW";
    } catch (e) {}
  }

  // 1. Polyfill-Load-Event triggern
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    try {
      window.dispatchEvent(new Event("load"));
    } catch (e) {}
  }

  // 2. Header-Brücken-Handler: Stellt sicher, dass Pfeil-Rechts von 'mehr' zum User-Profil führt
  directionalBridgeHandler = (event) => {
    if (isCursorActive()) return;

    const active = document.activeElement;
    if (!active) return;

    // A. Von 'mehr' nach RECHTS -> Direkt zur User-Leiste (Suche / Avatar / Name)
    if (event.key === "ArrowRight" || event.keyCode === KEY_CODES.ARROW_RIGHT) {
      if (
        active.matches(
          ".primary-navigation > ul > li:last-child, .primary-navigation > ul > li:last-child *",
        )
      ) {
        const target =
          document.querySelector(".menuSearchButton") ||
          document.querySelector(".avatar a") ||
          document.querySelector(".dd > p > a, .dd p a");

        if (target) {
          event.preventDefault();
          target.focus();
          Logger.info("[Nav Bridge] Von 'mehr' direkt zur User-Leiste:", target);
          return;
        }
      }
    }

    // B. Von User-Leiste nach LINKS -> Zurück zu 'mehr'
    if (event.key === "ArrowLeft" || event.keyCode === KEY_CODES.ARROW_LEFT) {
      if (active.matches(".menuSearchButton, .liveNewsFeedButton, .avatar a")) {
        const moreBtn = document.querySelector(
          ".primary-navigation > ul > li:last-child > strong, .primary-navigation > ul > li:last-child a",
        );
        if (moreBtn) {
          event.preventDefault();
          moreBtn.focus();
          Logger.info("[Nav Bridge] Von User-Leiste nach links zu 'mehr':", moreBtn);
          return;
        }
      }
    }

    // C. Vom Username (.dd p a) nach UNTEN -> Menü öffnen und ersten Link fokussieren
    if (event.key === "ArrowDown" || event.keyCode === KEY_CODES.ARROW_DOWN) {
      const ddContainer = active.closest(".dd");
      if (ddContainer) {
        ddContainer.classList.add(APP_CONFIG.MENU_OPEN_CLASS);
        const firstLink = ddContainer.querySelector(".modal ul li a");
        if (firstLink) {
          event.preventDefault();
          firstLink.focus();
          Logger.info("[Nav Bridge] Im User-Menü zu erstem Link navigiert:", firstLink);
          return;
        }
      }
    }

    // D. Vom ersten User-Menü-Eintrag nach OBEN -> Zurück zum User-Trigger
    if (event.key === "ArrowUp" || event.keyCode === KEY_CODES.ARROW_UP) {
      const firstModalLi = active.closest(".modal ul li:first-child");
      if (firstModalLi) {
        const ddTrigger = document.querySelector(".dd > p > a, .dd p a");
        if (ddTrigger) {
          event.preventDefault();
          ddTrigger.focus();
          Logger.info("[Nav Bridge] Zurück zum Username-Trigger:", ddTrigger);
          return;
        }
      }
    }
  };

  // 3. Enter-Key-Handler für Nicht-Standard-Buttons (z. B. Karussell-Pfeile span[data-action])
  enterKeyHandler = (event) => {
    if (isCursorActive()) return;

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

  window.addEventListener("keydown", directionalBridgeHandler, true);
  window.addEventListener("keydown", enterKeyHandler, true);

  setTimeout(setInitialFocus, 250);

  Logger.info("Spatial Navigation (inkl. Header-Brücke) aktiv.");
}

export function cleanupSpatialNav() {
  if (directionalBridgeHandler) {
    window.removeEventListener("keydown", directionalBridgeHandler, true);
    directionalBridgeHandler = null;
  }

  if (enterKeyHandler) {
    window.removeEventListener("keydown", enterKeyHandler, true);
    enterKeyHandler = null;
  }

  if (window.__spatialNavigation__) {
    try {
      window.__spatialNavigation__.keyMode = "NONE";
    } catch (e) {}
  }

  Logger.info("Spatial Navigation aufgeräumt und deaktiviert.");
}
