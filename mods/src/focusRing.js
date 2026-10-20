/**
 * focusRing.js
 * Schlankes, hochperformantes CSS für die TV-Fokusdarstellung.
 * Optimiert für schwächere TV-Grafikchips (kein box-shadow, keine teuren Transitions).
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
    /* Scharfer, hardware-beschleunigter TV-Fokusring ohne blur/shadow */
    :focus,
    :focus-visible,
    .${APP_CONFIG.FOCUS_CLASS} {
      outline: 3px solid ${APP_CONFIG.FOCUS_COLOR} !important;
      outline-offset: 2px !important;
    }

    /* Anime-Cover Hover-Infos bei TV-Fokus sofort sichtbar machen */
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
      border-radius: 4px !important;
      padding-top: 10px !important;
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
  Logger.info("TV-Fokus-Styles optimiert injiziert.");
}

export function removeFocusStyles() {
  const styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (styleEl) {
    styleEl.remove();
    Logger.info("TV-Fokus-Styles entfernt.");
  }
}
