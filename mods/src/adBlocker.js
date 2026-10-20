/**
 * adBlocker.js
 * Performanter Schutz vor Popups, Popundern und ungewollten Weiterleitungen beim Abspielen von Videos.
 * Verhindert strikt das Öffnen neuer Tabs, damit die TizenBrew-Umgebung nicht verlassen wird.
 */

import { Logger } from "./logger.js";

let clickInterceptor = null;
let iframeObserver = null;

const AD_DOMAIN_PATTERNS = [
  "popads",
  "popcash",
  "betting",
  "casino",
  "adserver",
  "onclick",
  "traffic",
  "doubleclick",
  "adnxs",
  "syndication",
  "adsystem",
  "redirect",
];

function isSuspiciousUrl(urlString) {
  if (!urlString) return false;
  const lower = urlString.toLowerCase();
  return AD_DOMAIN_PATTERNS.some((pattern) => lower.includes(pattern));
}

function securePlayerIframes(root = document) {
  try {
    const iframes = root.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      if (iframe.dataset.tvSecured) return;

      const currentSandbox = iframe.getAttribute("sandbox");
      if (!currentSandbox) {
        iframe.setAttribute(
          "sandbox",
          "allow-scripts allow-same-origin allow-forms allow-presentation",
        );
      }

      iframe.dataset.tvSecured = "1";
    });
  } catch (e) {}
}

function removeInvisibleAdOverlays() {
  try {
    const overlays = document.querySelectorAll(
      "div[style*='z-index: 2147483647'], div[style*='z-index: 999999'], a[target='_blank'][style*='position: absolute']",
    );

    overlays.forEach((el) => {
      if (el.id !== "aniworld-loader-toast" && el.id !== "aniworld-tv-cursor" && !el.closest(".main-header")) {
        const style = window.getComputedStyle(el);
        if (style.opacity === "0" || style.pointerEvents === "auto") {
          el.remove();
          Logger.info("[AdBlock] Unsichtbares Werbe-Overlay entfernt.");
        }
      }
    });
  } catch (e) {}
}

export function initAdBlocker() {
  Logger.info("Initialisiere TV-AdBlocker & Redirect-Schutz...");

  // 1. window.open abfangen: Verhindert Popups & neue Tabs auf TV!
  try {
    window.open = function (url) {
      if (!url) return null;

      // Ad-URLs komplett sperren
      if (isSuspiciousUrl(url)) {
        Logger.info("[AdBlock] window.open Werbe-URL blockiert:", url);
        return null;
      }

      // Legitime Aufrufe im SELBEN Fenster öffnen, damit TV nicht in separaten Tab wechselt
      Logger.info("[Navigation] window.open im aktuellen Fenster geöffnet:", url);
      window.location.href = url;
      return window;
    };
  } catch (e) {
    Logger.warn("[AdBlock] window.open konnte nicht überschrieben werden:", e);
  }

  // 2. document.write neutralisieren
  try {
    document.write = function () {};
    document.writeln = function () {};
  } catch (e) {}

  // 3. Klick-Interception im Capture-Phase
  clickInterceptor = (event) => {
    const target = event.target;
    if (!target || !(target instanceof Element)) return;

    const anchor = target.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href") || "";
    if (href.startsWith("#") || href.startsWith("javascript:")) {
      return;
    }

    try {
      const url = new URL(anchor.href, window.location.href);

      // Verdächtige Ad-Links blockieren
      if (isSuspiciousUrl(url.href)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        Logger.info("[AdBlock] Klick auf Ad-Link unterbunden:", url.href);
        return;
      }

      // Falls Link target="_blank" hat: Immer im selben Fenster öffnen
      if (anchor.target === "_blank" || anchor.getAttribute("target") === "_blank") {
        event.preventDefault();
        event.stopImmediatePropagation();
        anchor.target = "_self";
        anchor.removeAttribute("target");
        window.location.href = anchor.href;
      }
    } catch (e) {}
  };

  document.addEventListener("click", clickInterceptor, true);

  securePlayerIframes();
  removeInvisibleAdOverlays();

  if (typeof MutationObserver !== "undefined" && document.body) {
    let debounceTimer = null;
    iframeObserver = new MutationObserver(() => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        securePlayerIframes();
        removeInvisibleAdOverlays();
      }, 350);
    });

    iframeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  Logger.info("TV-AdBlocker aktiv.");
}

export function cleanupAdBlocker() {
  if (clickInterceptor) {
    document.removeEventListener("click", clickInterceptor, true);
    clickInterceptor = null;
  }

  if (iframeObserver) {
    iframeObserver.disconnect();
    iframeObserver = null;
  }

  Logger.info("TV-AdBlocker aufgeräumt.");
}
