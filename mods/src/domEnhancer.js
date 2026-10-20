/**
 * domEnhancer.js
 * Augmentiert interaktive DOM-Elemente mit tabindex="0" für das W3C Spatial Navigation Polyfill.
 * Streng optimiert mit Caching und Debouncing für maximale TV-Performance.
 */

import { INTERACTIVE_AUGMENT_SELECTORS } from "./constants.js";
import { Logger } from "./logger.js";

let mutationObserver = null;
let clickHandler = null;
let debounceTimeout = null;

// Erweitert Selektoren um :not([data-tv-ready]), um bereits augmentierte Elemente sofort zu überspringen
const SELECTOR_STRING = INTERACTIVE_AUGMENT_SELECTORS.map(
  (s) => `${s}:not([data-tv-ready])`,
).join(", ");

/**
 * Weist interaktiven Elementen tabindex="0" zu.
 */
export function augmentInteractiveElements(root = document) {
  try {
    const elements = root.querySelectorAll(SELECTOR_STRING);
    if (!elements || elements.length === 0) return;

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
  } catch (error) {
    Logger.error("Fehler beim Augmentieren der DOM-Elemente:", error);
  }
}

/**
 * Debounced-Variante für den MutationObserver, um CPU-Spitzen auf dem TV zu vermeiden.
 */
function debouncedAugment() {
  if (debounceTimeout) return;
  debounceTimeout = setTimeout(() => {
    debounceTimeout = null;
    augmentInteractiveElements();
  }, 250);
}

/**
 * Initialisiert den DOM-Observer und Klick-Handler.
 */
export function initDomEnhancer() {
  augmentInteractiveElements();

  if (typeof MutationObserver !== "undefined" && document.body) {
    mutationObserver = new MutationObserver((mutations) => {
      // Nur reagieren, wenn tatsächlich neue Nodes eingefügt wurden
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

  // Links mit target="_blank" auf TV im selben Tab öffnen
  clickHandler = (event) => {
    const target = event.target;
    if (!target || !(target instanceof Element)) return;

    const anchor = target.closest("a[target='_blank']");
    if (!anchor || !anchor.href) return;

    try {
      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.hostname.includes("aniworld.to")) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = anchor.href;
      }
    } catch (e) {}
  };

  document.addEventListener("click", clickHandler, true);
  Logger.info("DOM-Enhancer (Performance-optimiert) initialisiert.");
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
