/**
 * domEnhancer.js
 * Augmentiert interaktive DOM-Elemente mit tabindex="0" für das W3C Spatial Navigation Polyfill
 * und verhindert strikt das Öffnen neuer Browser-Tabs (target="_blank"), um das TV-Interface stabil zu halten.
 */

import { INTERACTIVE_AUGMENT_SELECTORS } from "./constants.js";
import { Logger } from "./logger.js";

let mutationObserver = null;
let clickHandler = null;
let debounceTimeout = null;

const SELECTOR_STRING = INTERACTIVE_AUGMENT_SELECTORS.map(
  (s) => `${s}:not([data-tv-ready])`,
).join(", ");

/**
 * Weist interaktiven Elementen tabindex="0" zu und bereinigt target="_blank".
 */
export function augmentInteractiveElements(root = document) {
  try {
    // 1. Spezifische Buttons und Header-Elemente augmentieren
    const elements = root.querySelectorAll(SELECTOR_STRING);
    if (elements && elements.length > 0) {
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el.hasAttribute("tabindex")) {
          el.setAttribute("tabindex", "0");
        }
        if (
          !el.hasAttribute("role") &&
          el.tagName !== "A" &&
          el.tagName !== "BUTTON"
        ) {
          el.setAttribute("role", "button");
        }
        el.dataset.tvReady = "1";
      }
    }

    // 2. target="_blank" entfernen, damit NIEMALS ein neuer Tab geöffnet wird
    const targetBlankLinks = root.querySelectorAll("a[target='_blank'], a[target='blank']");
    targetBlankLinks.forEach((a) => {
      a.target = "_self";
      a.removeAttribute("target");
    });
  } catch (error) {
    Logger.error("Fehler beim Augmentieren der DOM-Elemente:", error);
  }
}

function debouncedAugment() {
  if (debounceTimeout) return;
  debounceTimeout = setTimeout(() => {
    debounceTimeout = null;
    augmentInteractiveElements();
  }, 250);
}

export function initDomEnhancer() {
  augmentInteractiveElements();

  if (typeof MutationObserver !== "undefined" && document.body) {
    mutationObserver = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          debouncedAugment();
          break;
        }
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Globaler Klick-Abfang-Handler: Verhindert ausnahmslos neue Tabs auf dem TV
  clickHandler = (event) => {
    const target = event.target;
    if (!target || !(target instanceof Element)) return;

    const anchor = target.closest("a");
    if (!anchor || !anchor.href) return;

    // Ziel immer auf das aktuelle Fenster zwingen
    if (anchor.target && anchor.target !== "_self") {
      anchor.target = "_self";
    }

    // Falls ein Link noch _blank hat oder ein externer Trigger vorliegt
    if (anchor.getAttribute("target") === "_blank") {
      event.preventDefault();
      event.stopPropagation();
      anchor.removeAttribute("target");
      anchor.target = "_self";
      window.location.href = anchor.href;
    }
  };

  document.addEventListener("click", clickHandler, true);
  Logger.info("DOM-Enhancer (inkl. Tab-Schutz) initialisiert.");
}

export function cleanupDomEnhancer() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }

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
