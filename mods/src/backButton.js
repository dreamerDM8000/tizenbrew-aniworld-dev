/**
 * backButton.js
 * Verwaltet die Zurück-Taste (Tizen Hardware-Taste 'tizenhwkey' & TV-Fernbedienungstaste 10009).
 * Schließt geöffnete Menüs, beendet den Mauszeiger-Modus, navigiert in der Historie zurück
 * oder verlässt das Modul sauber auf der Startseite.
 */

import { KEY_CODES } from "./constants.js";
import { closeAllMenus } from "./menuController.js";
import { Logger } from "./logger.js";
import { isCursorActive, setCursorActive } from "./virtualCursor.js";

let tizenHwKeyHandler = null;
let keydownHandler = null;

function isAniWorldRoot() {
  const path = window.location.pathname;
  return path === "/" || path === "" || path === "/home";
}

function handleBackAction() {
  Logger.info("Back-Taste betätigt. Pfad:", window.location.pathname);

  // 0. Wenn virtueller Mauszeiger aktiv ist -> Zuerst Mauszeiger deaktivieren
  if (isCursorActive()) {
    Logger.info("Mauszeiger per Back-Taste beendet.");
    setCursorActive(false);
    return true;
  }

  // 1. Offene Dropdowns oder Modals schließen
  if (closeAllMenus()) {
    Logger.info("Menü durch Back-Taste geschlossen.");
    return true;
  }

  // 2. Befinden wir uns auf der Startseite / Root (aniworld.to)?
  if (isAniWorldRoot()) {
    Logger.info("Auf Root-Ebene (aniworld.to) - beende Modul und bereinige alle Ressourcen.");

    if (typeof window.__ANIWORLD_UNINIT__ === "function") {
      try {
        window.__ANIWORLD_UNINIT__();
      } catch (e) {
        Logger.error("Fehler beim Modul-Uninit auf Root:", e);
      }
    }

    try {
      sessionStorage.removeItem("aniworld_loaded");
    } catch (e) {}

    if (window.history.length > 1) {
      window.history.back();
      return true;
    }

    if (typeof tizen !== "undefined" && tizen.application) {
      try {
        tizen.application.getCurrentApplication().exit();
        return true;
      } catch (e) {}
    }

    return false;
  }

  // 3. Auf Unterseiten (Anime-Detail, Stream etc.) normal im Browser zurückblättern
  if (window.history.length > 1) {
    Logger.info("Navigiere in Browser-Historie zurück.");
    window.history.back();
    return true;
  }

  return false;
}

export function initBackButton() {
  tizenHwKeyHandler = (event) => {
    if (event.keyName === "back") {
      const handled = handleBackAction();
      if (handled) {
        event.preventDefault();
      }
    }
  };

  keydownHandler = (event) => {
    const isBackKey =
      event.keyCode === KEY_CODES.TIZEN_BACK ||
      event.key === "Back" ||
      event.key === "XF86Back" ||
      event.key === "Escape";

    if (isBackKey) {
      const handled = handleBackAction();
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  window.addEventListener("tizenhwkey", tizenHwKeyHandler);
  document.addEventListener("keydown", keydownHandler, true);
  Logger.info("Back-Button-Handler mit Cursor- & Root-Exit initialisiert.");
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
