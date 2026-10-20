/**
 * virtualCursor.js
 * Virtueller TV-Mauszeiger, der per Druck auf die ROTE TASTE aktiviert/deaktiviert wird.
 *
 * Ermöglicht es, auf Samsung Smart TVs Elemente anzusteuern und zu klicken,
 * die per Spatial Navigation schwer oder gar nicht erreichbar sind.
 */

import { Logger } from "./logger.js";

const CURSOR_ID = "aniworld-tv-cursor";
const STEP_BASE = 16;
const STEP_FAST = 32;

let active = false;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let cursorEl = null;
let keyHandler = null;
let lastHoveredElement = null;
let moveCount = 0;

function createCursorElement() {
  if (cursorEl) return cursorEl;

  cursorEl = document.createElement("div");
  cursorEl.id = CURSOR_ID;
  cursorEl.style.cssText = [
    "position: fixed",
    "top: 0",
    "left: 0",
    "width: 0",
    "height: 0",
    "border-left: 14px solid transparent",
    "border-right: 14px solid transparent",
    "border-top: 22px solid #FF6600",
    "transform: rotate(-45deg)",
    "z-index: 2147483647",
    "pointer-events: none",
    "filter: drop-shadow(0 2px 4px rgba(0,0,0,0.85))",
    "display: none",
  ].join(";");

  document.body.appendChild(cursorEl);
  return cursorEl;
}

function updateCursorPosition() {
  if (!cursorEl) return;
  cursorEl.style.left = `${cursorX}px`;
  cursorEl.style.top = `${cursorY}px`;
}

function fireMouseEvent(type, element) {
  if (!element) return;
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: cursorX,
    clientY: cursorY,
  });
  element.dispatchEvent(ev);
}

function updateHover() {
  if (!active || !cursorEl) return;

  cursorEl.style.display = "none";
  const el = document.elementFromPoint(cursorX, cursorY);
  cursorEl.style.display = "block";

  if (el === lastHoveredElement) return;

  if (lastHoveredElement) {
    fireMouseEvent("mouseout", lastHoveredElement);
    fireMouseEvent("mouseleave", lastHoveredElement);
  }

  if (el) {
    fireMouseEvent("mouseover", el);
    fireMouseEvent("mouseenter", el);
  }

  lastHoveredElement = el;
}

function moveCursor(dx, dy) {
  cursorX = Math.max(0, Math.min(window.innerWidth - 10, cursorX + dx));
  cursorY = Math.max(0, Math.min(window.innerHeight - 10, cursorY + dy));
  updateCursorPosition();
  updateHover();
}

function clickUnderCursor() {
  if (!cursorEl) return;

  cursorEl.style.display = "none";
  const el = document.elementFromPoint(cursorX, cursorY);
  cursorEl.style.display = "block";

  if (!el) return;

  Logger.info("[Cursor] Klick auf Element:", el);

  fireMouseEvent("mousedown", el);
  fireMouseEvent("mouseup", el);
  fireMouseEvent("click", el);

  // Falls es ein Link oder Button ist, Klick auslösen
  const clickable = el.closest("a, button, input, select, [tabindex]");
  if (clickable && typeof clickable.click === "function") {
    clickable.click();
  }
}

function showToast(message) {
  const existing = document.getElementById("aniworld-cursor-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "aniworld-cursor-toast";
  toast.textContent = message;
  toast.style.cssText = [
    "position: fixed",
    "top: 25px",
    "right: 25px",
    "background: #FF6600",
    "color: #FFFFFF",
    "padding: 8px 18px",
    "border-radius: 6px",
    "font-size: 17px",
    "font-weight: bold",
    "z-index: 2147483647",
    "pointer-events: none",
    "box-shadow: 0 4px 10px rgba(0,0,0,0.6)",
  ].join(";");

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

export function isCursorActive() {
  return active;
}

export function setCursorActive(state) {
  if (active === state) return;
  active = state;

  if (active) {
    // Spatial Navigation pausieren
    if (window.__spatialNavigation__) {
      try {
        window.__spatialNavigation__.keyMode = "NONE";
      } catch (e) {}
    }

    createCursorElement();
    cursorEl.style.display = "block";
    updateCursorPosition();
    updateHover();
    showToast("Mauszeiger aktiviert (Pfeiltasten zum Bewegen, OK zum Klicken)");
    Logger.info("Mauszeiger-Modus aktiviert.");
  } else {
    if (cursorEl) {
      cursorEl.style.display = "none";
    }

    if (lastHoveredElement) {
      fireMouseEvent("mouseout", lastHoveredElement);
      fireMouseEvent("mouseleave", lastHoveredElement);
      lastHoveredElement = null;
    }

    // Spatial Navigation reaktivieren
    if (window.__spatialNavigation__) {
      try {
        window.__spatialNavigation__.keyMode = "ARROW";
      } catch (e) {}
    }

    showToast("Mauszeiger deaktiviert (Normale Navigation)");
    Logger.info("Mauszeiger-Modus deaktiviert.");
  }
}

export function toggleCursor() {
  setCursorActive(!active);
}

export function initVirtualCursor() {
  keyHandler = (event) => {
    // Rote Taste auf Samsung Smart TV Fernbedienung (ColorF0Red / XF86Red / 403)
    const isRedKey =
      event.keyCode === 403 ||
      event.key === "ColorF0Red" ||
      event.key === "XF86Red";

    if (isRedKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleCursor();
      return;
    }

    // Wenn Mauszeiger-Modus NICHT aktiv ist, normale Navigation nicht beeinflussen
    if (!active) return;

    // Pfeiltasten bewegen den Cursor
    let step = STEP_BASE;
    moveCount++;
    if (moveCount > 4) step = STEP_FAST;

    switch (event.key) {
      case "ArrowUp":
        moveCursor(0, -step);
        break;
      case "ArrowDown":
        moveCursor(0, step);
        break;
      case "ArrowLeft":
        moveCursor(-step, 0);
        break;
      case "ArrowRight":
        moveCursor(step, 0);
        break;
      case "Enter":
        clickUnderCursor();
        break;
      case "Back":
      case "XF86Back":
      case "Escape":
        // Back schaltet den Mauszeiger aus, statt die Seite zu verlassen
        setCursorActive(false);
        break;
      default:
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  window.addEventListener("keyup", () => {
    moveCount = 0;
  });

  window.addEventListener("keydown", keyHandler, true);
  Logger.info("VirtualCursor-Modul initialisiert (Rote Taste registriert).");
}

export function cleanupVirtualCursor() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler, true);
    keyHandler = null;
  }

  setCursorActive(false);

  if (cursorEl) {
    cursorEl.remove();
    cursorEl = null;
  }

  Logger.info("VirtualCursor-Modul aufgeräumt.");
}

