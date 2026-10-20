/**
 * domEnhancer.js
 * Augmentiert interaktive DOM-Elemente auf AniWorld mit tabindex="0",
 * damit das W3C Spatial Navigation Polyfill sie zuverlässig fokussiert.
 */

import { INTERACTIVE_AUGMENT_SELECTORS } from "./constants.js";
import { Logger } from "./logger.js";

let mutationObserver = null;
let clickHandler = null;

/**
 * Weist allen spezifischen interaktiven Elementen tabindex="0" zu.
 */
export function augmentInteractiveElements(root = document) {
  try {
    const selector = INTERACTIVE_AUGMENT_SELECTORS.join(", ");
    const elements = root.querySelectorAll(selector);

    elements.forEach((el) => {
      if (!el.hasAttribute("tabindex")) {
        el.setAttribute("tabindex", "0");
      }
      if (!el.hasAttribute("role") && el.tagName !== "A" && el.tagName !== "BUTTON") {
        el.setAttribute("role", "button");
      }
    });
  } catch (error) {
    Logger.error("Fehler beim Augmentieren der DOM-Elemente:", error);
  }
}

/**
 * Initialisiert den DOM-Observer für dynamisch nachgeladene Inhalte
 * und fängt Klicks auf interne target="_blank"-Links ab (im selben Tab öffnen).
 */
export function initDomEnhancer() {
  augmentInteractiveElements();

  // MutationObserver für dynamischen Content (z. B. Filter, unendliches Scrollen)
  if (typeof MutationObserver !== "undefined" && document.body) {
    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          augmentInteractiveElements();
          break;
        }
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Links mit target="_blank" auf TV im aktuellen Fenster öffnen
  clickHandler = (event) => {
    const anchor = event.target.closest("a[target='_blank']");
    if (!anchor || !anchor.href) {
      return;
    }

    // Wenn es sich um einen internen Link handelt, im selben Tab öffnen
    try {
      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.hostname.includes("aniworld.to")) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = anchor.href;
      }
    } catch (e) {
      // Ignorieren bei ungültigen URLs
    }
  };

  document.addEventListener("click", clickHandler, true);
  Logger.info("DOM-Enhancer initialisiert.");
}

/**
 * Bereinigt Observer und Event-Listener beim Verlassen der Seite.
 */
export function cleanupDomEnhancer() {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  if (clickHandler) {
    document.removeEventListener("click", clickHandler, true);
    clickHandler = null;
  }

  Logger.info("DOM-Enhancer aufgeräumt.");
}

