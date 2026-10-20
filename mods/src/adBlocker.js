/**
 * adBlocker.js
 * Performanter Schutz vor Popups, Popundern und ungewollten Weiterleitungen beim Abspielen von Videos.
 * Speziell optimiert für Samsung Tizen Smart TVs (keine teuren DOM-Scans).
 */

import { Logger } from "./logger.js";

let clickInterceptor = null;
let iframeObserver = null;

// Bekannte Ad- und Tracking-Domains bzw. verdächtige Muster
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

/**
 * Prüft, ob eine URL verdächtig ist oder zu einem Ad-Netzwerk gehört.
 */
function isSuspiciousUrl(urlString) {
  if (!urlString) return false;
  const lower = urlString.toLowerCase();
  return AD_DOMAIN_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Schützt Video-Player-Iframes davor, die Hauptseite umzuleiten (Top-Navigation Hijacking).
 */
function securePlayerIframes(root = document) {
  try {
    const iframes = root.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      // Wenn bereits gesichert, überspringen
      if (iframe.dataset.tvSecured) return;

      // Verhindert, dass das Iframe die Top-Window-Location ändert oder Popups öffnet
      // Erlaubt weiterhin Scripts, Same-Origin und HTML5-Videowiedergabe
      const currentSandbox = iframe.getAttribute("sandbox");
      if (!currentSandbox) {
        iframe.setAttribute(
          "sandbox",
          "allow-scripts allow-same-origin allow-forms allow-presentation",
        );
      }

      iframe.dataset.tvSecured = "1";
    });
  } catch (e) {
    // Stilles Abfangen
  }
}

/**
 * Entfernt transparente Fake-Overlay-Elemente, die Klicks auf Video-Playern abfangen.
 */
function removeInvisibleAdOverlays() {
  try {
    // Typische transparente Ad-Layer über Video-Playern
    const overlays = document.querySelectorAll(
      "div[style*='z-index: 2147483647'], div[style*='z-index: 999999'], a[target='_blank'][style*='position: absolute']",
    );

    overlays.forEach((el) => {
      // Nur Elemente entfernen, die keine echten TV-Elemente sind
      if (el.id !== "aniworld-loader-toast" && !el.closest(".main-header")) {
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

  // 1. window.open neutralisieren (verhindert Popups & Popunder bei Video-Klicks)
  try {
    window.open = function (url) {
      Logger.info("[AdBlock] window.open blockiert:", url);
      return null;
    };
  } catch (e) {
    Logger.warn("[AdBlock] window.open konnte nicht überschrieben werden:", e);
  }

  // 2. document.write neutralisieren (verhindert synchrone Ad-Injektionen)
  try {
    document.write = function () {};
    document.writeln = function () {};
  } catch (e) {}

  // 3. Klick-Interception im Capture-Phase (fängt Klicks auf Fake-Ads und externe Links ab)
  clickInterceptor = (event) => {
    const target = event.target;
    if (!target || !(target instanceof Element)) return;

    // A-Tag oder übergeordneten Link finden
    const anchor = target.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href") || "";

    // Normale interne Navigation nicht blockieren
    if (href.startsWith("#") || href.startsWith("javascript:")) {
      return;
    }

    try {
      const url = new URL(anchor.href, window.location.href);

      // Verdächtige Ad-Links sofort blockieren
      if (isSuspiciousUrl(url.href)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        Logger.info("[AdBlock] Klick auf Ad-Link unterbunden:", url.href);
        return;
      }

      // Wenn das Ziel extern ist und target="_blank" hat, aber nicht zu AniWorld gehört:
      const currentHost = window.location.hostname;
      if (url.hostname !== currentHost && anchor.target === "_blank") {
        // Nicht zu AniWorld gehörende Popups/Ads verhindern
        if (
          !url.hostname.includes("aniworld") &&
          !url.hostname.includes("s.to")
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          Logger.info(
            "[AdBlock] Ungewollte Weiterleitung zu externer Seite blockiert:",
            url.href,
          );
        }
      }
    } catch (e) {}
  };

  document.addEventListener("click", clickInterceptor, true);

  // 4. Iframes sichern und unsichtbare Layer entfernen
  securePlayerIframes();
  removeInvisibleAdOverlays();

  // Observer für neu geladene Video-Iframes (z. B. nach Hoster-Auswahl)
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

