/**
 * menuController.js
 * Verwaltet TV-Dropdown-Menüs (wie 'mehr' und User-Profil),
 * damit diese bei Fokus oder Klick geöffnet bleiben und per Back-Taste geschlossen werden können.
 */

import { APP_CONFIG } from "./constants.js";
import { Logger } from "./logger.js";

let focusInHandler = null;
let keydownHandler = null;

/**
 * Schließt alle aktuell geöffneten TV-Menüs.
 * @returns {boolean} True, wenn ein Menü geöffnet war und geschlossen wurde.
 */
export function closeAllMenus() {
  const openMenus = document.querySelectorAll(`.${APP_CONFIG.MENU_OPEN_CLASS}`);
  if (openMenus.length > 0) {
    openMenus.forEach((el) => el.classList.remove(APP_CONFIG.MENU_OPEN_CLASS));
    Logger.debug("Geöffnete Menüs geschlossen.");
    return true;
  }
  return false;
}

/**
 * Initialisiert die Menüsteuerung für TV-Fokus und Enter.
 */
export function initMenuController() {
  // Wenn der Fokus in ein Menü oder dessen Trigger wandert
  focusInHandler = (event) => {
    const focusedEl = event.target;
    if (!focusedEl || !(focusedEl instanceof Element)) return;

    // Dropdown 'mehr'
    const moreMenuLi = focusedEl.closest(".primary-navigation > ul > li");
    if (moreMenuLi && moreMenuLi.querySelector("ul")) {
      moreMenuLi.classList.add(APP_CONFIG.MENU_OPEN_CLASS);
    } else {
      document
        .querySelectorAll(`.primary-navigation > ul > li.${APP_CONFIG.MENU_OPEN_CLASS}`)
        .forEach((li) => li.classList.remove(APP_CONFIG.MENU_OPEN_CLASS));
    }

    // User-Menü (.dd)
    const ddContainer = focusedEl.closest(".dd");
    if (ddContainer) {
      ddContainer.classList.add(APP_CONFIG.MENU_OPEN_CLASS);
    } else {
      document
        .querySelectorAll(`.dd.${APP_CONFIG.MENU_OPEN_CLASS}`)
        .forEach((dd) => dd.classList.remove(APP_CONFIG.MENU_OPEN_CLASS));
    }
  };

  // Enter-Taste auf Menü-Headern zum Umschalten
  keydownHandler = (event) => {
    if (event.key === "Enter" || event.keyCode === 13) {
      const activeEl = document.activeElement;
      if (!activeEl) return;

      // Klick auf 'mehr' Trigger
      if (activeEl.matches(".primary-navigation > ul > li > strong")) {
        const parentLi = activeEl.closest("li");
        if (parentLi) {
          const isOpen = parentLi.classList.toggle(APP_CONFIG.MENU_OPEN_CLASS);
          if (isOpen) {
            // Fokus auf erstes Sub-Element setzen, falls vorhanden
            const firstSubLink = parentLi.querySelector("ul li a");
            if (firstSubLink) {
              setTimeout(() => firstSubLink.focus(), 50);
            }
          }
          event.preventDefault();
        }
      }
    }
  };

  document.addEventListener("focusin", focusInHandler, true);
  document.addEventListener("keydown", keydownHandler, true);
  Logger.info("Menu-Controller initialisiert.");
}

/**
 * Bereinigt die Event-Listener der Menüsteuerung.
 */
export function cleanupMenuController() {
  if (focusInHandler) {
    document.removeEventListener("focusin", focusInHandler, true);
    focusInHandler = null;
  }

  if (keydownHandler) {
    document.removeEventListener("keydown", keydownHandler, true);
    keydownHandler = null;
  }

  closeAllMenus();
  Logger.info("Menu-Controller aufgeräumt.");
}

