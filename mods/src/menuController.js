/**
 * menuController.js
 * Verwaltet TV-Dropdown-Menüs (wie 'mehr' und User-Profil) mit minimaler CPU-Last.
 */

import { APP_CONFIG } from "./constants.js";
import { Logger } from "./logger.js";

let focusInHandler = null;
let keydownHandler = null;
let activeOpenMenu = null;

/**
 * Schließt das aktuell geöffnete TV-Menü in O(1).
 * @returns {boolean} True, wenn ein Menü geöffnet war und geschlossen wurde.
 */
export function closeAllMenus() {
  if (activeOpenMenu) {
    activeOpenMenu.classList.remove(APP_CONFIG.MENU_OPEN_CLASS);
    activeOpenMenu = null;
    Logger.debug("Aktives Menü geschlossen.");
    return true;
  }
  return false;
}

/**
 * Initialisiert die Menüsteuerung.
 */
export function initMenuController() {
  focusInHandler = (event) => {
    const focusedEl = event.target;
    if (!focusedEl || !(focusedEl instanceof Element)) return;

    let targetMenu = null;

    // Prüfen, ob der Fokus in einem Menü liegt
    const moreMenuLi = focusedEl.closest(".primary-navigation > ul > li");
    if (moreMenuLi && moreMenuLi.querySelector("ul")) {
      targetMenu = moreMenuLi;
    } else {
      const ddContainer = focusedEl.closest(".dd");
      if (ddContainer) {
        targetMenu = ddContainer;
      }
    }

    if (targetMenu) {
      if (activeOpenMenu && activeOpenMenu !== targetMenu) {
        activeOpenMenu.classList.remove(APP_CONFIG.MENU_OPEN_CLASS);
      }
      targetMenu.classList.add(APP_CONFIG.MENU_OPEN_CLASS);
      activeOpenMenu = targetMenu;
    } else if (activeOpenMenu) {
      // Fokus hat das Menü verlassen
      activeOpenMenu.classList.remove(APP_CONFIG.MENU_OPEN_CLASS);
      activeOpenMenu = null;
    }
  };

  // Enter-Taste auf Menü-Headern zum Umschalten
  keydownHandler = (event) => {
    if (event.key === "Enter" || event.keyCode === 13) {
      const activeEl = document.activeElement;
      if (!activeEl) return;

      if (activeEl.matches(".primary-navigation > ul > li > strong")) {
        const parentLi = activeEl.closest("li");
        if (parentLi) {
          const isOpen = parentLi.classList.toggle(APP_CONFIG.MENU_OPEN_CLASS);
          activeOpenMenu = isOpen ? parentLi : null;
          if (isOpen) {
            const firstSubLink = parentLi.querySelector("ul li a");
            if (firstSubLink) {
              firstSubLink.focus();
            }
          }
          event.preventDefault();
        }
      }
    }
  };

  document.addEventListener("focusin", focusInHandler, true);
  document.addEventListener("keydown", keydownHandler, true);
  Logger.info("Menu-Controller (O(1) optimiert) initialisiert.");
}

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
