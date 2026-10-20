/**
 * focusRing.js
 * Injiziert High-Visibility CSS für die TV-Fokusdarstellung und Hover-Simulationen.
 */

import { APP_CONFIG } from "./constants.js";
import { Logger } from "./logger.js";

const STYLE_ELEMENT_ID = "aniworld-tv-styles";

export function injectFocusStyles() {
  if (document.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }

  const styleEl = document.createElement("style");
  styleEl.id = STYLE_ELEMENT_ID;
  styleEl.textContent = `
    /* Globaler High-Visibility Fokusrahmen für 10-Foot TV UI */
    :focus,
    :focus-visible,
    .${APP_CONFIG.FOCUS_CLASS} {
      outline: 4px solid ${APP_CONFIG.FOCUS_COLOR} !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 12px rgba(255, 102, 0, 0.8) !important;
      transition: outline 0.15s ease-in-out, box-shadow 0.15s ease-in-out !important;
    }

    /* Weiches Scrollen bei Fokus-Wechsel */
    html {
      scroll-behavior: smooth !important;
    }

    /* Anime-Cover Hover-Effekt bei TV-Fokus sichtbar machen */
    .coverListItem:focus-within .seriesListHorizontalEffect,
    .coverListItem:has(:focus) .seriesListHorizontalEffect {
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Dropdown 'mehr' im Header bei Öffnen anzeigen */
    .primary-navigation > ul > li.${APP_CONFIG.MENU_OPEN_CLASS} > ul {
      display: block !important;
      position: absolute !important;
      overflow: visible !important;
      width: 175px !important;
      border-radius: 5px !important;
      padding-top: 15px !important;
      z-index: 999999 !important;
      left: -25px !important;
    }

    /* Dropdown User-Menü (.dd) bei Öffnen anzeigen */
    .dd.${APP_CONFIG.MENU_OPEN_CLASS} .modal {
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
      z-index: 999999 !important;
    }

    /* User-Avatar bei Fokus hervorheben */
    .avatar:focus-within,
    .avatar:has(:focus) {
      overflow: visible !important;
      z-index: 10000 !important;
      position: relative !important;
    }
  `;

  document.head.appendChild(styleEl);
  Logger.info("TV-Fokus-Styles erfolgreich injiziert.");
}

export function removeFocusStyles() {
  const styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (styleEl) {
    styleEl.remove();
    Logger.info("TV-Fokus-Styles entfernt.");
  }
}

