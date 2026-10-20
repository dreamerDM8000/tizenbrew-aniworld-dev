/**
 * backButton.js
 * Verwaltet die Zurück-Taste (Tizen Hardware-Taste 'tizenhwkey' & TV-Fernbedienungstaste 10009).
 * Schließt offene Menüs, navigiert in der Browser-Historie zurück oder beendet die App.
 */

import { KEY_CODES } from "./constants.js";
import { closeAllMenus } from "./menuController.js";
import { Logger } from "./logger.js";

let tizenHwKeyHandler = null;
let keydownHandler = null;

function handleBackAction() {
  Logger.info("Back-Taste betätigt.");

  // 1. Offene Dropdowns oder Modals schließen
  if (closeAllMenus()) {
    Logger.info("Menü durch Back-Taste geschlossen.");
    return true;
  }

  // 2. In Browser-Historie zurückblättern
  if (window.history.length > 1) {
    Logger.info("Navigiere in Browser-Historie zurück.");
    window.history.back();
    return true;
  }

  // 3. Wenn am Anfang der Historie -> App auf Samsung TV beenden
  if (typeof tizen !== "undefined" && tizen.application) {
    try {
      Logger.info("Verlasse Tizen-Anwendung.");
      tizen.application.getCurrentApplication().exit();
      return true;
    } catch (e) {
      Logger.error("Fehler beim Beenden der Tizen-App:", e);
    }
  }

  return false;
}

export function initBackButton() {
  // Samsung Tizen Hardware Key Event
  tizenHwKeyHandler = (event) => {
    if (event.keyName === "back") {
      event.preventDefault();
      handleBackAction();
    }
  };

  // Standard Keydown Fallback (z. B. auf TV-Fernbedienung oder PC)
  keydownHandler = (event) => {
    const isBackKey =
      event.keyCode === KEY_CODES.TIZEN_BACK ||
      event.key === "Back" ||
      event.key === "XF86Back" ||
      event.key === "Escape";

    if (isBackKey) {
      event.preventDefault();
      event.stopPropagation();
      handleBackAction();
    }
  };

  window.addEventListener("tizenhwkey", tizenHwKeyHandler);
  document.addEventListener("keydown", keydownHandler, true);
  Logger.info("Back-Button-Handler initialisiert.");
}

export function cleanupBackButton() {
  if (tizenHwKeyHandler) {
    window.removeEventListener("tizenhwkey", tizenHwKeyHandler);
    tizenHwKeyHandler = null;
  }

  if (keydownHandler) {
    document.removeEventListener("keydown", keydownHandler, true);
    keydownHandler = null;
  }

  Logger.info("Back-Button-Handler aufgeräumt.");
}

