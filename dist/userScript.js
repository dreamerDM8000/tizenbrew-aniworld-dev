(function () {
  'use strict';

  /**
   * constants.js
   * Zentrale Konfigurationskonstanten für das AniWorld Tizen TV Script.
   */

  const APP_CONFIG = {
    NAME: "AniWorld TV",
    VERSION: "1.0.8",
    STORAGE_CACHE_KEY: "aniworld_script_cache",
    STORAGE_SESSION_KEY: "aniworld_loaded",
    FOCUS_CLASS: "tv-focused",
    MENU_OPEN_CLASS: "tv-menu-open",
    FOCUS_COLOR: "#FF6600",
  };

  const INTERACTIVE_AUGMENT_SELECTORS = [
    // Karussell-Steuerung (vor / zurück)
    ".coverListNavigation span[data-action]",
    // Suche & Benachrichtigungen im Header
    ".menuSearchButton",
    ".liveNewsFeedButton",
    // Dropdown-Menü 'mehr' im Header
    ".primary-navigation > ul > li > strong",
    // User Profil & Dropdown-Menü im Header
    ".avatar a",
    ".dd > p > a",
    ".dd p a",
    ".dd .modal a",
    // Mobile/Responsive Menü-Button
    ".js-menu-button",
  ];

  const KEY_CODES = {
    ENTER: 13,
    ARROW_LEFT: 37,
    ARROW_UP: 38,
    ARROW_RIGHT: 39,
    ARROW_DOWN: 40,
    // Tizen HW Back / Return
    TIZEN_BACK: 10009,
  };

  /**
   * logger.js
   * Sicheres Logging mit Prefix für einfaches Remote-Debugging auf Tizen Smart TVs.
   */

  const PREFIX = "[AniWorld-TV]";

  const Logger = {
    info(...args) {
      console.log(PREFIX, ...args);
    },

    warn(...args) {
      console.warn(PREFIX, ...args);
    },

    error(...args) {
      console.error(PREFIX, ...args);
    },

    debug(...args) {
      // Aktivierbar via window.__ANIWORLD_DEBUG__
      if (window.__ANIWORLD_DEBUG__) {
        console.debug(PREFIX, ...args);
      }
    },
  };

  /**
   * focusRing.js
   * Schlankes, hochperformantes CSS für die TV-Fokusdarstellung.
   * Optimiert für schwächere TV-Grafikchips (kein box-shadow, keine teuren Transitions).
   */


  const STYLE_ELEMENT_ID = "aniworld-tv-styles";

  function injectFocusStyles() {
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

    /* Header als eigenständigen Navigations-Container definieren */
    header.main-header {
      --spatial-navigation-contain: contain !important;
      position: relative !important;
      z-index: 10000 !important;
    }

    /* Header-Buttons für Spatial Navigation räumlich klar definieren */
    .menuSearchButton,
    .liveNewsFeedButton {
      display: inline-block !important;
      min-width: 34px !important;
      min-height: 24px !important;
      cursor: pointer !important;
    }

    .avatar a,
    .dd p a {
      display: inline-block !important;
      min-height: 24px !important;
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

  function removeFocusStyles() {
    const styleEl = document.getElementById(STYLE_ELEMENT_ID);
    if (styleEl) {
      styleEl.remove();
      Logger.info("TV-Fokus-Styles entfernt.");
    }
  }

  /**
   * domEnhancer.js
   * Augmentiert interaktive DOM-Elemente mit tabindex="0" für das W3C Spatial Navigation Polyfill
   * und verhindert strikt das Öffnen neuer Browser-Tabs (target="_blank"), um das TV-Interface stabil zu halten.
   */


  let mutationObserver = null;
  let clickHandler = null;
  let debounceTimeout = null;

  const SELECTOR_STRING = INTERACTIVE_AUGMENT_SELECTORS.map(
    (s) => `${s}:not([data-tv-ready])`,
  ).join(", ");

  /**
   * Weist interaktiven Elementen tabindex="0" zu und bereinigt target="_blank".
   */
  function augmentInteractiveElements(root = document) {
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

  function initDomEnhancer() {
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

  function cleanupDomEnhancer() {
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

  /**
   * menuController.js
   * Verwaltet TV-Dropdown-Menüs (wie 'mehr' und User-Profil) mit minimaler CPU-Last.
   */


  let focusInHandler = null;
  let keydownHandler$1 = null;
  let activeOpenMenu = null;

  function closeAllMenus() {
    if (activeOpenMenu) {
      activeOpenMenu.classList.remove(APP_CONFIG.MENU_OPEN_CLASS);
      activeOpenMenu = null;
      Logger.debug("Aktives Menü geschlossen.");
      return true;
    }
    return false;
  }

  function initMenuController() {
    focusInHandler = (event) => {
      const focusedEl = event.target;
      if (!focusedEl || !(focusedEl instanceof Element)) return;

      let targetMenu = null;

      // Prüfen, ob der Fokus im Dropdown 'mehr' liegt
      const moreMenuLi = focusedEl.closest(".primary-navigation > ul > li");
      if (moreMenuLi && moreMenuLi.querySelector("ul")) {
        targetMenu = moreMenuLi;
      } else {
        // Prüfen, ob der Fokus im User-Menü (.dd) liegt
        const ddContainer = focusedEl.closest(".dd");
        if (ddContainer) {
          targetMenu = ddContainer;
        }
      }

      if (targetMenu) {
        if (activeOpenMenu && activeOpenMenu !== targetMenu) {
          activeOpenMenu.classList.remove(APP_CONFIG.MENU_OPEN_CLASS);
        }
        targetMenu.classList.add(APP_CONFIG.MENU_OPEN_CLASS);
        activeOpenMenu = targetMenu;
      } else if (activeOpenMenu) {
        activeOpenMenu.classList.remove(APP_CONFIG.MENU_OPEN_CLASS);
        activeOpenMenu = null;
      }
    };

    // Enter-Taste auf Menü-Headern zum Umschalten
    keydownHandler$1 = (event) => {
      if (event.key === "Enter" || event.keyCode === 13) {
        const activeEl = document.activeElement;
        if (!activeEl) return;

        // 1. Klick auf 'mehr' Trigger
        if (activeEl.matches(".primary-navigation > ul > li > strong")) {
          const parentLi = activeEl.closest("li");
          if (parentLi) {
            const isOpen = parentLi.classList.toggle(APP_CONFIG.MENU_OPEN_CLASS);
            activeOpenMenu = isOpen ? parentLi : null;
            if (isOpen) {
              const firstSubLink = parentLi.querySelector("ul li a");
              if (firstSubLink) {
                firstSubLink.focus();
              }
            }
            event.preventDefault();
          }
        }

        // 2. Klick auf User-Profil Trigger (.dd p a)
        if (activeEl.closest(".dd > p > a, .dd p a")) {
          const ddContainer = activeEl.closest(".dd");
          if (ddContainer) {
            const isOpen = ddContainer.classList.toggle(APP_CONFIG.MENU_OPEN_CLASS);
            activeOpenMenu = isOpen ? ddContainer : null;
            if (isOpen) {
              const firstModalLink = ddContainer.querySelector(".modal ul li a");
              if (firstModalLink) {
                firstModalLink.focus();
              }
            }
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener("focusin", focusInHandler, true);
    document.addEventListener("keydown", keydownHandler$1, true);
    Logger.info("Menu-Controller (inkl. User-Menü-Toggle) initialisiert.");
  }

  function cleanupMenuController() {
    if (focusInHandler) {
      document.removeEventListener("focusin", focusInHandler, true);
      focusInHandler = null;
    }

    if (keydownHandler$1) {
      document.removeEventListener("keydown", keydownHandler$1, true);
      keydownHandler$1 = null;
    }

    closeAllMenus();
    Logger.info("Menu-Controller aufgeräumt.");
  }

  /**
   * virtualCursor.js
   * Virtueller TV-Mauszeiger, der per Druck auf die ROTE TASTE aktiviert/deaktiviert wird.
   *
   * Ermöglicht es, auf Samsung Smart TVs Elemente anzusteuern und zu klicken,
   * die per Spatial Navigation schwer oder gar nicht erreichbar sind.
   */


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

  function isCursorActive() {
    return active;
  }

  function setCursorActive(state) {
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

  function toggleCursor() {
    setCursorActive(!active);
  }

  function initVirtualCursor() {
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

  function cleanupVirtualCursor() {
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

  /**
   * backButton.js
   * Verwaltet die Zurück-Taste (Tizen Hardware-Taste 'tizenhwkey' & TV-Fernbedienungstaste 10009).
   * Schließt geöffnete Menüs, beendet den Mauszeiger-Modus, navigiert in der Historie zurück
   * oder verlässt das Modul sauber auf der Startseite.
   */


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

  function initBackButton() {
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

  function cleanupBackButton() {
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

  /* Spatial Navigation Polyfill
   *
   * It follows W3C official specification
   * https://drafts.csswg.org/css-nav-1/
   *
   * Copyright (c) 2018-2019 LG Electronics Inc.
   * https://github.com/WICG/spatial-navigation/polyfill
   *
   * Licensed under the MIT license (MIT)
   */

  (function () {

    // The polyfill must not be executed, if it's already enabled via browser engine or browser extensions.
    if ('navigate' in window) {
      return;
    }

    const ARROW_KEY_CODE = {37: 'left', 38: 'up', 39: 'right', 40: 'down'};
    const TAB_KEY_CODE = 9;
    let mapOfBoundRect = null;
    let startingPoint = null; // Saves spatial navigation starting point
    let savedSearchOrigin = {element: null, rect: null};  // Saves previous search origin
    let searchOriginRect = null;  // Rect of current search origin

    /**
     * Initiate the spatial navigation features of the polyfill.
     * @function initiateSpatialNavigation
     */
    function initiateSpatialNavigation() {
      /*
       * Bind the standards APIs to be exposed to the window object for authors
       */
      window.navigate = navigate;
      window.Element.prototype.spatialNavigationSearch = spatialNavigationSearch;
      window.Element.prototype.focusableAreas = focusableAreas;
      window.Element.prototype.getSpatialNavigationContainer = getSpatialNavigationContainer;

      /*
       * CSS.registerProperty() from the Properties and Values API
       * Reference: https://drafts.css-houdini.org/css-properties-values-api/#the-registerproperty-function
       */
      if (window.CSS && CSS.registerProperty) {
        if (window.getComputedStyle(document.documentElement).getPropertyValue('--spatial-navigation-contain') === '') {
          CSS.registerProperty({
            name: '--spatial-navigation-contain',
            syntax: 'auto | contain',
            inherits: false,
            initialValue: 'auto'
          });
        }

        if (window.getComputedStyle(document.documentElement).getPropertyValue('--spatial-navigation-action') === '') {
          CSS.registerProperty({
            name: '--spatial-navigation-action',
            syntax: 'auto | focus | scroll',
            inherits: false,
            initialValue: 'auto'
          });
        }

        if (window.getComputedStyle(document.documentElement).getPropertyValue('--spatial-navigation-function') === '') {
          CSS.registerProperty({
            name: '--spatial-navigation-function',
            syntax: 'normal | grid',
            inherits: false,
            initialValue: 'normal'
          });
        }
      }
    }

    /**
     * Add event handlers for the spatial navigation behavior.
     * This function defines which input methods trigger the spatial navigation behavior.
     * @function spatialNavigationHandler
     */
    function spatialNavigationHandler() {
      /*
       * keydown EventListener :
       * If arrow key pressed, get the next focusing element and send it to focusing controller
       */
      window.addEventListener('keydown', (e) => {
        const currentKeyMode = (parent && parent.__spatialNavigation__.keyMode) || window.__spatialNavigation__.keyMode;
        const eventTarget = document.activeElement;
        const dir = ARROW_KEY_CODE[e.keyCode];

        if (e.keyCode === TAB_KEY_CODE) {
          startingPoint = null;
        }

        if (!currentKeyMode ||
            (currentKeyMode === 'NONE') ||
            ((currentKeyMode === 'SHIFTARROW') && !e.shiftKey) ||
            ((currentKeyMode === 'ARROW') && e.shiftKey) ||
            (e.ctrlKey || e.metaKey || e.altKey))
          return;

        if (!e.defaultPrevented) {
          let focusNavigableArrowKey = {left: true, up: true, right: true, down: true};

          // Edge case (text input, area) : Don't move focus, just navigate cursor in text area
          if ((eventTarget.nodeName === 'INPUT') || eventTarget.nodeName === 'TEXTAREA') {
            focusNavigableArrowKey = handlingEditableElement(e);
          }

          if (focusNavigableArrowKey[dir]) {
            e.preventDefault();
            mapOfBoundRect = new Map();

            navigate(dir);

            mapOfBoundRect = null;
            startingPoint = null;
          }
        }
      });

      /*
       * mouseup EventListener :
       * If the mouse click a point in the page, the point will be the starting point.
       * NOTE: Let UA set the spatial navigation starting point based on click
       */
      document.addEventListener('mouseup', (e) => {
        startingPoint = {x: e.clientX, y: e.clientY};
      });

      /*
       * focusin EventListener :
       * When the element get the focus, save it and its DOMRect for resetting the search origin
       * if it disappears.
       */
      window.addEventListener('focusin', (e) => {
        if (e.target !== window) {
          savedSearchOrigin.element = e.target;
          savedSearchOrigin.rect = e.target.getBoundingClientRect();
        }
      });
    }

    /**
     * Enable the author to trigger spatial navigation programmatically, as if the user had done so manually.
     * @see {@link https://drafts.csswg.org/css-nav-1/#dom-window-navigate}
     * @function navigate
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     */
    function navigate(dir) {
      // spatial navigation steps

      // 1
      const searchOrigin = findSearchOrigin();
      let eventTarget = searchOrigin;

      let elementFromPosition = null;

      // 2 Optional step, UA defined starting point
      if (startingPoint) {
        // if there is a starting point, set eventTarget as the element from position for getting the spatnav container
        elementFromPosition = document.elementFromPoint(startingPoint.x, startingPoint.y);

        // Use starting point if the starting point isn't inside the focusable element (but not container)
        // * Starting point is meaningfull when:
        // 1) starting point is inside the spatnav container
        // 2) starting point is inside the non-focusable element
        if (elementFromPosition === null) {
          elementFromPosition = document.body;
        }
        if (isFocusable(elementFromPosition) && !isContainer(elementFromPosition)) {
          startingPoint = null;
        } else if (isContainer(elementFromPosition)) {
          eventTarget = elementFromPosition;
        } else {
          eventTarget = elementFromPosition.getSpatialNavigationContainer();
        }
      }

      // 4
      if (eventTarget === document || eventTarget === document.documentElement) {
        eventTarget = document.body || document.documentElement;
      }

      // 5
      // At this point, spatialNavigationSearch can be applied.
      // If startingPoint is either a scroll container or the document,
      // find the best candidate within startingPoint
      let container = null;
      if ((isContainer(eventTarget) || eventTarget.nodeName === 'BODY') && !(eventTarget.nodeName === 'INPUT')) {
        if (eventTarget.nodeName === 'IFRAME') {
          eventTarget = eventTarget.contentDocument.documentElement;
        }
        container = eventTarget;
        let bestInsideCandidate = null;

        // 5-2
        if ((document.activeElement === searchOrigin) || 
            (document.activeElement === document.body) && (searchOrigin === document.documentElement)) {
          if (getCSSSpatNavAction(eventTarget) === 'scroll') {
            if (scrollingController(eventTarget, dir)) return;
          } else if (getCSSSpatNavAction(eventTarget) === 'focus') {
            bestInsideCandidate = eventTarget.spatialNavigationSearch(dir, {container: eventTarget, candidates: getSpatialNavigationCandidates(eventTarget, {mode: 'all'})});
            if (focusingController(bestInsideCandidate, dir)) return;
          } else if (getCSSSpatNavAction(eventTarget) === 'auto') {
            bestInsideCandidate = eventTarget.spatialNavigationSearch(dir, {container: eventTarget});
            if (focusingController(bestInsideCandidate, dir) || scrollingController(eventTarget, dir)) return;
          }
        } else {
          // when the previous search origin became offscreen
          container = container.getSpatialNavigationContainer();
        }
      }

      // 6
      // Let container be the nearest ancestor of eventTarget
      container = eventTarget.getSpatialNavigationContainer();
      let parentContainer = (container.parentElement) ? container.getSpatialNavigationContainer() : null;

      // When the container is the viewport of a browsing context
      if (!parentContainer && ( window.location !== window.parent.location)) {
        parentContainer = window.parent.document.documentElement;
      }

      if (getCSSSpatNavAction(container) === 'scroll') {
        if (scrollingController(container, dir)) return;
      } else if (getCSSSpatNavAction(container) === 'focus') {
        navigateChain(eventTarget, container, parentContainer, dir, 'all');
      } else if (getCSSSpatNavAction(container) === 'auto') {
        navigateChain(eventTarget, container, parentContainer, dir, 'visible');
      }
    }

    /**
     * Move the focus to the best candidate or do nothing.
     * @function focusingController
     * @param bestCandidate {Node} - The best candidate of the spatial navigation
     * @param dir {SpatialNavigationDirection}- The directional information for the spatial navigation (e.g. LRUD)
     * @returns {boolean}
     */
    function focusingController(bestCandidate, dir) {
      // 10 & 11
      // When bestCandidate is found
      if (bestCandidate) {
        // When bestCandidate is a focusable element and not a container : move focus
        /*
         * [event] navbeforefocus : Fired before spatial or sequential navigation changes the focus.
         */
        if (!createSpatNavEvents('beforefocus', bestCandidate, null, dir)) 
          return true;

        const container = bestCandidate.getSpatialNavigationContainer();

        if ((container !== window) && (getCSSSpatNavAction(container) === 'focus')) {
          bestCandidate.focus();
        } else {
          bestCandidate.focus({preventScroll: true});
        }

        startingPoint = null;
        return true;
      }

      // When bestCandidate is not found within the scrollport of a container: Nothing
      return false;
    }

    /**
     * Directionally scroll the scrollable spatial navigation container if it can be manually scrolled more.
     * @function scrollingController
     * @param container {Node} - The spatial navigation container which can scroll
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {boolean}
     */
    function scrollingController(container, dir) {

      // If there is any scrollable area among parent elements and it can be manually scrolled, scroll the document
      if (isScrollable(container, dir) && !isScrollBoundary(container, dir)) {
        moveScroll(container, dir);
        return true;
      }

      // If the spatnav container is document and it can be scrolled, scroll the document
      if (!container.parentElement && !isHTMLScrollBoundary(container, dir)) {
        moveScroll(container.ownerDocument.documentElement, dir);
        return true;
      }
      return false;
    }

    /**
     * Find the candidates within a spatial navigation container include delegable container.
     * This function does not search inside delegable container or focusable container.
     * In other words, this return candidates set is not included focusable elements inside delegable container or focusable container.
     *
     * @function getSpatialNavigationCandidates
     * @param container {Node} - The spatial navigation container
     * @param option {FocusableAreasOptions} - 'mode' attribute takes 'visible' or 'all' for searching the boundary of focusable elements.
     *                                          Default value is 'visible'.
     * @returns {sequence<Node>} candidate elements within the container
     */
    function getSpatialNavigationCandidates (container, option = {mode: 'visible'}) {
      let candidates = [];

      if (container.childElementCount > 0) {
        if (!container.parentElement) {
          container = container.getElementsByTagName('body')[0] || document.body;
        }
        const children = container.children;
        for (const elem of children) {
          if (isDelegableContainer(elem)) {
            candidates.push(elem);
          } else if (isFocusable(elem)) {
            candidates.push(elem);

            if (!isContainer(elem) && elem.childElementCount) {
              candidates = candidates.concat(getSpatialNavigationCandidates(elem, {mode: 'all'}));
            }
          } else if (elem.childElementCount) {
            candidates = candidates.concat(getSpatialNavigationCandidates(elem, {mode: 'all'}));
          }
        }
      }
      return (option.mode === 'all') ? candidates : candidates.filter(isVisible);
    }

    /**
     * Find the candidates among focusable elements within a spatial navigation container from the search origin (currently focused element)
     * depending on the directional information.
     * @function getFilteredSpatialNavigationCandidates
     * @param element {Node} - The currently focused element which is defined as 'search origin' in the spec
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @param candidates {sequence<Node>} - The candidates for spatial navigation without the directional information
     * @param container {Node} - The spatial navigation container
     * @returns {Node} The candidates for spatial navigation considering the directional information
     */
    function getFilteredSpatialNavigationCandidates (element, dir, candidates, container) {
      const targetElement = element;
      // Removed below line due to a bug. (iframe body rect is sometime weird.)
      // const targetElement = (element.nodeName === 'IFRAME') ? element.contentDocument.body : element;
      // If the container is unknown, get the closest container from the element
      container = container || targetElement.getSpatialNavigationContainer();

      // If the candidates is unknown, find candidates
      // 5-1
      candidates = (!candidates || candidates.length <= 0) ? getSpatialNavigationCandidates(container) : candidates;
      return filteredCandidates(targetElement, candidates, dir, container);
    }

    /**
     * Find the best candidate among the candidates within the container from the search origin (currently focused element)
     * @see {@link https://drafts.csswg.org/css-nav-1/#dom-element-spatialnavigationsearch}
     * @function spatialNavigationSearch
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @param candidates {sequence<Node>} - The candidates for spatial navigation
     * @param container {Node} - The spatial navigation container
     * @returns {Node} The best candidate which will gain the focus
     */
    function spatialNavigationSearch (dir, args) {
      const targetElement = this;
      let internalCandidates = [];
      let externalCandidates = [];
      let insideOverlappedCandidates = getOverlappedCandidates(targetElement);
      let bestTarget;

      // Set default parameter value
      if (!args)
        args = {};

      const defaultContainer = targetElement.getSpatialNavigationContainer();
      let defaultCandidates = getSpatialNavigationCandidates(defaultContainer);
      const container = args.container || defaultContainer;
      if (args.container && (defaultContainer.contains(args.container))) {
        defaultCandidates = defaultCandidates.concat(getSpatialNavigationCandidates(container));
      }
      const candidates = (args.candidates && args.candidates.length > 0) ? 
                            args.candidates.filter((candidate) => container.contains(candidate)) : 
                            defaultCandidates.filter((candidate) => container.contains(candidate) && (container !== candidate));

      // Find the best candidate
      // 5
      // If startingPoint is either a scroll container or the document,
      // find the best candidate within startingPoint
      if (candidates && candidates.length > 0) {

        // Divide internal or external candidates
        candidates.forEach(candidate => {
          if (candidate !== targetElement) {
            (targetElement.contains(candidate) && targetElement !== candidate ? internalCandidates : externalCandidates).push(candidate);
          }
        });

        // include overlapped element to the internalCandidates
        let fullyOverlapped = insideOverlappedCandidates.filter(candidate => !internalCandidates.includes(candidate));
        let overlappedContainer = candidates.filter(candidate => (isContainer(candidate) && isEntirelyVisible(targetElement, candidate)));
        let overlappedByParent = overlappedContainer.map((elm) => elm.focusableAreas()).flat().filter(candidate => candidate !== targetElement);
        
        internalCandidates = internalCandidates.concat(fullyOverlapped).filter((candidate) => container.contains(candidate));
        externalCandidates = externalCandidates.concat(overlappedByParent).filter((candidate) => container.contains(candidate));

        // Filter external Candidates
        if (externalCandidates.length > 0) {
          externalCandidates = getFilteredSpatialNavigationCandidates(targetElement, dir, externalCandidates, container);
        }
        
        // If there isn't search origin element but search orgin rect exist  (search origin isn't in the layout case)
        if (searchOriginRect) {
          bestTarget = selectBestCandidate(targetElement, getFilteredSpatialNavigationCandidates(targetElement, dir, internalCandidates, container), dir);
        }

        if ((internalCandidates && internalCandidates.length > 0) && !(targetElement.nodeName === 'INPUT')) {
          bestTarget = selectBestCandidateFromEdge(targetElement, internalCandidates, dir);
        }

        bestTarget = bestTarget || selectBestCandidate(targetElement, externalCandidates, dir);

        if (bestTarget && isDelegableContainer(bestTarget)) {
          // if best target is delegable container, then find descendants candidate inside delegable container.
          const innerTarget = getSpatialNavigationCandidates(bestTarget, {mode: 'all'});
          const descendantsBest = innerTarget.length > 0 ? targetElement.spatialNavigationSearch(dir, {candidates: innerTarget, container: bestTarget}) : null;
          if (descendantsBest) {
            bestTarget = descendantsBest;
          } else if (!isFocusable(bestTarget)) {
            // if there is no target inside bestTarget and delegable container is not focusable,
            // then try to find another best target without curren best target.
            candidates.splice(candidates.indexOf(bestTarget), 1);
            bestTarget = candidates.length ? targetElement.spatialNavigationSearch(dir, {candidates: candidates, container: container}) : null;
          }
        }
        return bestTarget;
      }

      return null;
    }

    /**
     * Get the filtered candidate among candidates.
     * @see {@link https://drafts.csswg.org/css-nav-1/#select-the-best-candidate}
     * @function filteredCandidates
     * @param currentElm {Node} - The currently focused element which is defined as 'search origin' in the spec
     * @param candidates {sequence<Node>} - The candidates for spatial navigation
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @param container {Node} - The spatial navigation container
     * @returns {sequence<Node>} The filtered candidates which are not the search origin and not in the given spatial navigation direction from the search origin
     */
    // TODO: Need to fix filtering the candidates with more clean code
    function filteredCandidates(currentElm, candidates, dir, container) {
      const originalContainer = currentElm.getSpatialNavigationContainer();
      let eventTargetRect;

      // If D(dir) is null, let candidates be the same as visibles
      if (dir === undefined)
        return candidates;

      // Offscreen handling when originalContainer is not <HTML>
      if (originalContainer.parentElement && container !== originalContainer && !isVisible(currentElm)) {
        eventTargetRect = getBoundingClientRect(originalContainer);
      } else {
        eventTargetRect = searchOriginRect || getBoundingClientRect(currentElm);
      }

      /*
       * Else, let candidates be the subset of the elements in visibles
       * whose principal box’s geometric center is within the closed half plane
       * whose boundary goes through the geometric center of starting point and is perpendicular to D.
       */
      if ((isContainer(currentElm) || currentElm.nodeName === 'BODY') && !(currentElm.nodeName === 'INPUT')) {
        return candidates.filter(candidate => {
          const candidateRect = getBoundingClientRect(candidate);
          return container.contains(candidate) &&
            ((currentElm.contains(candidate) && isInside(eventTargetRect, candidateRect) && candidate !== currentElm) ||
            isOutside(candidateRect, eventTargetRect, dir));
        });
      } else {
        return candidates.filter(candidate => {
          const candidateRect = getBoundingClientRect(candidate);
          const candidateBody = (candidate.nodeName === 'IFRAME') ? candidate.contentDocument.body : null;
          return container.contains(candidate) &&
            candidate !== currentElm && candidateBody !== currentElm &&
            isOutside(candidateRect, eventTargetRect, dir) &&
            !isInside(eventTargetRect, candidateRect);
        });
      }
    }

    /**
     * Select the best candidate among given candidates.
     * @see {@link https://drafts.csswg.org/css-nav-1/#select-the-best-candidate}
     * @function selectBestCandidate
     * @param currentElm {Node} - The currently focused element which is defined as 'search origin' in the spec
     * @param candidates {sequence<Node>} - The candidates for spatial navigation
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {Node} The best candidate which will gain the focus
     */
    function selectBestCandidate(currentElm, candidates, dir) {
      const container = currentElm.getSpatialNavigationContainer();
      const spatialNavigationFunction = getComputedStyle(container).getPropertyValue('--spatial-navigation-function');
      const currentTargetRect = searchOriginRect || getBoundingClientRect(currentElm);
      let distanceFunction;
      let alignedCandidates;

      switch (spatialNavigationFunction) {
      case 'grid':
        alignedCandidates = candidates.filter(elm => isAligned(currentTargetRect, getBoundingClientRect(elm), dir));
        if (alignedCandidates.length > 0) {
          candidates = alignedCandidates;
        }
        distanceFunction = getAbsoluteDistance;
        break;
      default:
        distanceFunction = getDistance;
        break;
      }
      return getClosestElement(currentElm, candidates, dir, distanceFunction);
    }

    /**
     * Select the best candidate among candidates by finding the closet candidate from the edge of the currently focused element (search origin).
     * @see {@link https://drafts.csswg.org/css-nav-1/#select-the-best-candidate (Step 5)}
     * @function selectBestCandidateFromEdge
     * @param currentElm {Node} - The currently focused element which is defined as 'search origin' in the spec
     * @param candidates {sequence<Node>} - The candidates for spatial navigation
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {Node} The best candidate which will gain the focus
     */
    function selectBestCandidateFromEdge(currentElm, candidates, dir) {
      if (startingPoint)
        return getClosestElement(currentElm, candidates, dir, getDistanceFromPoint);
      else
        return getClosestElement(currentElm, candidates, dir, getInnerDistance);
    }

    /**
     * Select the closest candidate from the currently focused element (search origin) among candidates by using the distance function.
     * @function getClosestElement
     * @param currentElm {Node} - The currently focused element which is defined as 'search origin' in the spec
     * @param candidates {sequence<Node>} - The candidates for spatial navigation
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @param distanceFunction {function} - The distance function which measures the distance from the search origin to each candidate
     * @returns {Node} The candidate which is the closest one from the search origin
     */
    function getClosestElement(currentElm, candidates, dir, distanceFunction) {
      let eventTargetRect = null;
      if (( window.location !== window.parent.location ) && (currentElm.nodeName === 'BODY' || currentElm.nodeName === 'HTML')) {
        // If the eventTarget is iframe, then get rect of it based on its containing document
        // Set the iframe's position as (0,0) because the rects of elements inside the iframe don't know the real iframe's position.
        eventTargetRect = window.frameElement.getBoundingClientRect();
        eventTargetRect.x = 0;
        eventTargetRect.y = 0;
      } else {
        eventTargetRect = searchOriginRect || currentElm.getBoundingClientRect();
      }

      let minDistance = Number.POSITIVE_INFINITY;
      let minDistanceElements = [];

      if (candidates) {
        for (let i = 0; i < candidates.length; i++) {
          const distance = distanceFunction(eventTargetRect, getBoundingClientRect(candidates[i]), dir);

          // If the same distance, the candidate will be selected in the DOM order
          if (distance < minDistance) {
            minDistance = distance;
            minDistanceElements = [candidates[i]];
          } else if (distance === minDistance) {
            minDistanceElements.push(candidates[i]);
          }
        }
      }
      if (minDistanceElements.length === 0)
        return null;

      return (minDistanceElements.length > 1 && distanceFunction === getAbsoluteDistance) ?
        getClosestElement(currentElm, minDistanceElements, dir, getEuclideanDistance) : minDistanceElements[0];
    }

    /**
     * Get container of an element.
     * @see {@link https://drafts.csswg.org/css-nav-1/#dom-element-getspatialnavigationcontainer}
     * @module Element
     * @function getSpatialNavigationContainer
     * @returns {Node} The spatial navigation container
     */
    function getSpatialNavigationContainer() {
      let container = this;

      do {
        if (!container.parentElement) {
          if (window.location !== window.parent.location) {
            container = window.parent.document.documentElement;
          } else {
            container = window.document.documentElement;
          }
          break;
        } else {
          container = container.parentElement;
        }
      } while (!isContainer(container));
      return container;
    }

    /**
     * Get nearest scroll container of an element.
     * @function getScrollContainer
     * @param Element
     * @returns {Node} The spatial navigation container
     */
    function getScrollContainer(element) {
      let scrollContainer = element;

      do {
        if (!scrollContainer.parentElement) {
          if (window.location !== window.parent.location) {
            scrollContainer = window.parent.document.documentElement;
          } else {
            scrollContainer = window.document.documentElement;
          }
          break;
        } else {
          scrollContainer = scrollContainer.parentElement;
        }
      } while (!isScrollContainer(scrollContainer) || !isVisible(scrollContainer));

      if (scrollContainer === document || scrollContainer === document.documentElement) {
        scrollContainer = window;
      }
    
      return scrollContainer;
    }

    /**
     * Find focusable elements within the spatial navigation container.
     * @see {@link https://drafts.csswg.org/css-nav-1/#dom-element-focusableareas}
     * @function focusableAreas
     * @param option {FocusableAreasOptions} - 'mode' attribute takes 'visible' or 'all' for searching the boundary of focusable elements.
     *                                          Default value is 'visible'.
     * @returns {sequence<Node>} All focusable elements or only visible focusable elements within the container
     */
    function focusableAreas(option = {mode: 'visible'}) {
      const container = this.parentElement ? this : document.body;
      const focusables = Array.prototype.filter.call(container.getElementsByTagName('*'), isFocusable);
      return (option.mode === 'all') ? focusables : focusables.filter(isVisible);
    }

    /**
     * Create the NavigationEvent: navbeforefocus, navnotarget
     * @see {@link https://drafts.csswg.org/css-nav-1/#events-navigationevent}
     * @function createSpatNavEvents
     * @param option {string} - Type of the navigation event (beforefocus, notarget)
     * @param element {Node} - The target element of the event
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     */
    function createSpatNavEvents(eventType, containerElement, currentElement, direction) {
      if (['beforefocus', 'notarget'].includes(eventType)) {
        const data = {
          causedTarget: currentElement,
          dir: direction
        };
        const triggeredEvent = new CustomEvent('nav' + eventType, {bubbles: true, cancelable: true, detail: data});
        return containerElement.dispatchEvent(triggeredEvent);
      }
    }

    /**
     * Get the value of the CSS custom property of the element
     * @function readCssVar
     * @param element {Node}
     * @param varName {string} - The name of the css custom property without '--'
     * @returns {string} The value of the css custom property
     */
    function readCssVar(element, varName) {
      return element.style.getPropertyValue(`--${varName}`).trim();
    }

    /**
     * Decide whether or not the 'contain' value is given to 'spatial-navigation-contain' css property of an element
     * @function isCSSSpatNavContain
     * @param element {Node}
     * @returns {boolean}
     */
    function isCSSSpatNavContain(element) {
      return readCssVar(element, 'spatial-navigation-contain') === 'contain';
    }

    /**
     * Return the value of 'spatial-navigation-action' css property of an element
     * @function getCSSSpatNavAction
     * @param element {Node} - would be the spatial navigation container
     * @returns {string} auto | focus | scroll
     */
    function getCSSSpatNavAction(element) {
      return readCssVar(element, 'spatial-navigation-action') || 'auto';
    }

    /**
     * Only move the focus with spatial navigation. Manually scrolling isn't available.
     * @function navigateChain
     * @param eventTarget {Node} - currently focused element
     * @param container {SpatialNavigationContainer} - container
     * @param parentContainer {SpatialNavigationContainer} - parent container
     * @param option - visible || all
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     */
    function navigateChain(eventTarget, container, parentContainer, dir, option) {
      let currentOption = {candidates: getSpatialNavigationCandidates(container, {mode: option}), container};

      while (parentContainer) {
        if (focusingController(eventTarget.spatialNavigationSearch(dir, currentOption), dir)) {
          return;
        } else {
          if ((option === 'visible') && scrollingController(container, dir)) return;
          else {
            if (!createSpatNavEvents('notarget', container, eventTarget, dir)) return;

            // find the container
            if (container === document || container === document.documentElement) {
              if ( window.location !== window.parent.location ) {
                // The page is in an iframe. eventTarget needs to be reset because the position of the element in the iframe
                eventTarget = window.frameElement;
                container = eventTarget.ownerDocument.documentElement;              
              }
            } else {
              container = parentContainer;
            }
            currentOption = {candidates: getSpatialNavigationCandidates(container, {mode: option}), container};
            let nextContainer = container.getSpatialNavigationContainer();

            if (nextContainer !== container) {
              parentContainer = nextContainer;
            } else {
              parentContainer = null;
            }
          }
        }
      }

      currentOption = {candidates: getSpatialNavigationCandidates(container, {mode: option}), container};

      // Behavior after 'navnotarget' - Getting out from the current spatnav container
      if ((!parentContainer && container) && focusingController(eventTarget.spatialNavigationSearch(dir, currentOption), dir)) return;

      if (!createSpatNavEvents('notarget', currentOption.container, eventTarget, dir)) return;

      if ((getCSSSpatNavAction(container) === 'auto') && (option === 'visible')) {
        if (scrollingController(container, dir)) return;
      }
    }

    /**
     * Find search origin
     * @see {@link https://drafts.csswg.org/css-nav-1/#nav}
     * @function findSearchOrigin
     * @returns {Node} The search origin for the spatial navigation
     */
    function findSearchOrigin() {
      let searchOrigin = document.activeElement;

      if (!searchOrigin || (searchOrigin === document.body && !document.querySelector(':focus'))) {
        // When the previous search origin lost its focus by blur: (1) disable attribute (2) visibility: hidden
        if (savedSearchOrigin.element && (searchOrigin !== savedSearchOrigin.element)) {
          const elementStyle = window.getComputedStyle(savedSearchOrigin.element, null);
          const invisibleStyle = ['hidden', 'collapse'];

          if (savedSearchOrigin.element.disabled || invisibleStyle.includes(elementStyle.getPropertyValue('visibility'))) {
            searchOrigin = savedSearchOrigin.element;
            return searchOrigin;
          }
        }
        searchOrigin = document.documentElement;
      }
      // When the previous search origin lost its focus by blur: (1) display:none () element size turned into zero
      if (savedSearchOrigin.element &&
        ((getBoundingClientRect(savedSearchOrigin.element).height === 0) || (getBoundingClientRect(savedSearchOrigin.element).width === 0))) {
        searchOriginRect = savedSearchOrigin.rect;
      }
      
      if (!isVisibleInScroller(searchOrigin)) {
        const scroller = getScrollContainer(searchOrigin);
        if (scroller && ((scroller === window) || (getCSSSpatNavAction(scroller) === 'auto')))
          return scroller;
      }
      return searchOrigin;
    }

    /**
     * Move the scroll of an element depending on the given spatial navigation directrion
     * (Assume that User Agent defined distance is '40px')
     * @see {@link https://drafts.csswg.org/css-nav-1/#directionally-scroll-an-element}
     * @function moveScroll
     * @param element {Node} - The scrollable element
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @param offset {Number} - The explicit amount of offset for scrolling. Default value is 0.
     */
    function moveScroll(element, dir, offset = 0) {
      if (element) {
        switch (dir) {
        case 'left': element.scrollLeft -= (40 + offset); break;
        case 'right': element.scrollLeft += (40 + offset); break;
        case 'up': element.scrollTop -= (40 + offset); break;
        case 'down': element.scrollTop += (40 + offset); break;
        }
      }
    }

    /**
     * Decide whether an element is container or not.
     * @function isContainer
     * @param element {Node} element
     * @returns {boolean}
     */
    function isContainer(element) {
      return (!element.parentElement) ||
              (element.nodeName === 'IFRAME') ||
              (isScrollContainer(element)) ||
              (isCSSSpatNavContain(element));
    }

    /**
     * Decide whether an element is delegable container or not.
     * NOTE: THIS IS NON-NORMATIVE API. 
     * @function isDelegableContainer
     * @param element {Node} element
     * @returns {boolean}
     */
    function isDelegableContainer(element) {
      return readCssVar(element, 'spatial-navigation-contain') === 'delegable';
    }

    /**
     * Decide whether an element is a scrollable container or not.
     * @see {@link https://drafts.csswg.org/css-overflow-3/#scroll-container}
     * @function isScrollContainer
     * @param element {Node}
     * @returns {boolean}
     */
    function isScrollContainer(element) {
      const elementStyle = window.getComputedStyle(element, null);
      const overflowX = elementStyle.getPropertyValue('overflow-x');
      const overflowY = elementStyle.getPropertyValue('overflow-y');

      return ((overflowX !== 'visible' && overflowX !== 'clip' && isOverflow(element, 'left')) ||
            (overflowY !== 'visible' && overflowY !== 'clip' && isOverflow(element, 'down'))) ?
             true : false;
    }

    /**
     * Decide whether this element is scrollable or not.
     * NOTE: If the value of 'overflow' is given to either 'visible', 'clip', or 'hidden', the element isn't scrollable.
     *       If the value is 'hidden', the element can be only programmically scrollable. (https://drafts.csswg.org/css-overflow-3/#valdef-overflow-hidden)
     * @function isScrollable
     * @param element {Node}
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {boolean}
     */
    function isScrollable(element, dir) { // element, dir
      if (element && typeof element === 'object') {
        if (dir && typeof dir === 'string') { // parameter: dir, element
          if (isOverflow(element, dir)) {
            // style property
            const elementStyle = window.getComputedStyle(element, null);
            const overflowX = elementStyle.getPropertyValue('overflow-x');
            const overflowY = elementStyle.getPropertyValue('overflow-y');

            switch (dir) {
            case 'left':
              /* falls through */
            case 'right':
              return (overflowX !== 'visible' && overflowX !== 'clip' && overflowX !== 'hidden');
            case 'up':
              /* falls through */
            case 'down':
              return (overflowY !== 'visible' && overflowY !== 'clip' && overflowY !== 'hidden');
            }
          }
          return false;
        } else { // parameter: element
          return (element.nodeName === 'HTML' || element.nodeName === 'BODY') ||
                  (isScrollContainer(element) && isOverflow(element));
        }
      }
    }

    /**
     * Decide whether an element is overflow or not.
     * @function isOverflow
     * @param element {Node}
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {boolean}
     */
    function isOverflow(element, dir) {
      if (element && typeof element === 'object') {
        if (dir && typeof dir === 'string') { // parameter: element, dir
          switch (dir) {
          case 'left':
            /* falls through */
          case 'right':
            return (element.scrollWidth > element.clientWidth);
          case 'up':
            /* falls through */
          case 'down':
            return (element.scrollHeight > element.clientHeight);
          }
        } else { // parameter: element
          return (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight);
        }
        return false;
      }
    }

    /**
     * Decide whether the scrollbar of the browsing context reaches to the end or not.
     * @function isHTMLScrollBoundary
     * @param element {Node} - The top browsing context
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {boolean}
     */
    function isHTMLScrollBoundary(element, dir) {
      let result = false;
      switch (dir) {
      case 'left':
        result = element.scrollLeft === 0;
        break;
      case 'right':
        result = (element.scrollWidth - element.scrollLeft - element.clientWidth) === 0;
        break;
      case 'up':
        result = element.scrollTop === 0;
        break;
      case 'down':
        result = (element.scrollHeight - element.scrollTop - element.clientHeight) === 0;
        break;
      }
      return result;
    }

    /**
     * Decide whether the scrollbar of an element reaches to the end or not.
     * @function isScrollBoundary
     * @param element {Node}
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {boolean}
     */
    function isScrollBoundary(element, dir) {
      if (isScrollable(element, dir)) {
        const winScrollY = element.scrollTop;
        const winScrollX = element.scrollLeft;

        const height = element.scrollHeight - element.clientHeight;
        const width = element.scrollWidth - element.clientWidth;

        switch (dir) {
        case 'left': return (winScrollX === 0);
        case 'right': return (Math.abs(winScrollX - width) <= 1);
        case 'up': return (winScrollY === 0);
        case 'down': return (Math.abs(winScrollY - height) <= 1);
        }
      }
      return false;
    }

    /**
     * Decide whether an element is inside the scorller viewport or not
     *
     * @function isVisibleInScroller
     * @param element {Node}
     * @returns {boolean}
     */
    function isVisibleInScroller(element) {
      const elementRect = element.getBoundingClientRect();
      let nearestScroller = getScrollContainer(element);

      let scrollerRect = null;
      if (nearestScroller !== window) {
        scrollerRect = getBoundingClientRect(nearestScroller);
      } else {
        scrollerRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      }
     
      if (isInside(scrollerRect, elementRect) && isInside(scrollerRect, elementRect))
        return true; 
      else
        return false;
    }

    /**
     * Decide whether an element is focusable for spatial navigation.
     * 1. If element is the browsing context (document, iframe), then it's focusable,
     * 2. If the element is scrollable container (regardless of scrollable axis), then it's focusable,
     * 3. The value of tabIndex >= 0, then it's focusable,
     * 4. If the element is disabled, it isn't focusable,
     * 5. If the element is expressly inert, it isn't focusable,
     * 6. Whether the element is being rendered or not.
     *
     * @function isFocusable
     * @param element {Node}
     * @returns {boolean}
     *
     * @see {@link https://html.spec.whatwg.org/multipage/interaction.html#focusable-area}
     */
    function isFocusable(element) {
      if ((element.tabIndex < 0) || isAtagWithoutHref(element) || isActuallyDisabled(element) || isExpresslyInert(element) || !isBeingRendered(element))
        return false;
      else if ((!element.parentElement) || (isScrollable(element) && isOverflow(element)) || (element.tabIndex >= 0))
        return true;
    }

    /**
     * Decide whether an element is a tag without href attribute or not.
     *
     * @function isAtagWithoutHref
     * @param element {Node}
     * @returns {boolean}
     */
    function isAtagWithoutHref(element) {
      return (element.tagName === 'A' && element.getAttribute('href') === null && element.getAttribute('tabIndex') === null);
    }

    /**
     * Decide whether an element is actually disabled or not.
     *
     * @function isActuallyDisabled
     * @param element {Node}
     * @returns {boolean}
     *
     * @see {@link https://html.spec.whatwg.org/multipage/semantics-other.html#concept-element-disabled}
     */
    function isActuallyDisabled(element) {
      if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTGROUP', 'OPTION', 'FIELDSET'].includes(element.tagName))
        return (element.disabled);
      else
        return false;
    }

    /**
     * Decide whether the element is expressly inert or not.
     * @see {@link https://html.spec.whatwg.org/multipage/interaction.html#expressly-inert}
     * @function isExpresslyInert
     * @param element {Node}
     * @returns {boolean}
     */
    function isExpresslyInert(element) {
      return ((element.inert) && (!element.ownerDocument.documentElement.inert));
    }

    /**
     * Decide whether the element is being rendered or not.
     * 1. If an element has the style as "visibility: hidden | collapse" or "display: none", it is not being rendered.
     * 2. If an element has the style as "opacity: 0", it is not being rendered.(that is, invisible).
     * 3. If width and height of an element are explicitly set to 0, it is not being rendered.
     * 4. If a parent element is hidden, an element itself is not being rendered.
     * (CSS visibility property and display property are inherited.)
     * @see {@link https://html.spec.whatwg.org/multipage/rendering.html#being-rendered}
     * @function isBeingRendered
     * @param element {Node}
     * @returns {boolean}
     */
    function isBeingRendered(element) {
      if (!isVisibleStyleProperty(element.parentElement))
        return false;
      if (!isVisibleStyleProperty(element) || (element.style.opacity === '0') ||
          (window.getComputedStyle(element).height === '0px' || window.getComputedStyle(element).width === '0px'))
        return false;
      return true;
    }

    /**
     * Decide whether this element is partially or completely visible to user agent.
     * @function isVisible
     * @param element {Node}
     * @returns {boolean}
     */
    function isVisible(element) {
      return (!element.parentElement) || (isVisibleStyleProperty(element) && hitTest(element));
    }

    /**
     * Decide whether this element is completely visible in this viewport for the arrow direction.
     * @function isEntirelyVisible
     * @param element {Node}
     * @returns {boolean}
     */
    function isEntirelyVisible(element, container) {
      const rect = getBoundingClientRect(element);
      const containerElm = container || element.getSpatialNavigationContainer();
      const containerRect = getBoundingClientRect(containerElm);

      // FIXME: when element is bigger than container?
      const entirelyVisible = !((rect.left < containerRect.left) ||
        (rect.right > containerRect.right) ||
        (rect.top < containerRect.top) ||
        (rect.bottom > containerRect.bottom));

      return entirelyVisible;
    }

    /**
     * Decide the style property of this element is specified whether it's visible or not.
     * @function isVisibleStyleProperty
     * @param element {CSSStyleDeclaration}
     * @returns {boolean}
     */
    function isVisibleStyleProperty(element) {
      const elementStyle = window.getComputedStyle(element, null);
      const thisVisibility = elementStyle.getPropertyValue('visibility');
      const thisDisplay = elementStyle.getPropertyValue('display');
      const invisibleStyle = ['hidden', 'collapse'];

      return (thisDisplay !== 'none' && !invisibleStyle.includes(thisVisibility));
    }

    /**
     * Decide whether this element is entirely or partially visible within the viewport.
     * @function hitTest
     * @param element {Node}
     * @returns {boolean}
     */
    function hitTest(element) {
      const elementRect = getBoundingClientRect(element);
      if (element.nodeName !== 'IFRAME' && (elementRect.top < 0 || elementRect.left < 0 ||
        elementRect.top > element.ownerDocument.documentElement.clientHeight || elementRect.left >element.ownerDocument.documentElement.clientWidth))
        return false;

      let offsetX = parseInt(element.offsetWidth) / 10;
      let offsetY = parseInt(element.offsetHeight) / 10;

      offsetX = isNaN(offsetX) ? 1 : offsetX;
      offsetY = isNaN(offsetY) ? 1 : offsetY;

      const hitTestPoint = {
        // For performance, just using the three point(middle, leftTop, rightBottom) of the element for hit testing
        middle: [(elementRect.left + elementRect.right) / 2, (elementRect.top + elementRect.bottom) / 2],
        leftTop: [elementRect.left + offsetX, elementRect.top + offsetY],
        rightBottom: [elementRect.right - offsetX, elementRect.bottom - offsetY]
      };

      for(const point in hitTestPoint) {
        const elemFromPoint = element.ownerDocument.elementFromPoint(...hitTestPoint[point]);
        if (element === elemFromPoint || element.contains(elemFromPoint)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Decide whether a child element is entirely or partially Included within container visually.
     * @function isInside
     * @param containerRect {DOMRect}
     * @param childRect {DOMRect}
     * @returns {boolean}
     */
    function isInside(containerRect, childRect) {
      const rightEdgeCheck = (containerRect.left < childRect.right && containerRect.right >= childRect.right);
      const leftEdgeCheck = (containerRect.left <= childRect.left && containerRect.right > childRect.left);
      const topEdgeCheck = (containerRect.top <= childRect.top && containerRect.bottom > childRect.top);
      const bottomEdgeCheck = (containerRect.top < childRect.bottom && containerRect.bottom >= childRect.bottom);
      return (rightEdgeCheck || leftEdgeCheck) && (topEdgeCheck || bottomEdgeCheck);
    }

    /**
     * Decide whether this element is entirely or partially visible within the viewport.
     * Note: rect1 is outside of rect2 for the dir
     * @function isOutside
     * @param rect1 {DOMRect}
     * @param rect2 {DOMRect}
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {boolean}
     */
    function isOutside(rect1, rect2, dir) {
      switch (dir) {
      case 'left':
        return isRightSide(rect2, rect1);
      case 'right':
        return isRightSide(rect1, rect2);
      case 'up':
        return isBelow(rect2, rect1);
      case 'down':
        return isBelow(rect1, rect2);
      default:
        return false;
      }
    }

    /* rect1 is right of rect2 */
    function isRightSide(rect1, rect2) {
      return rect1.left >= rect2.right || (rect1.left >= rect2.left && rect1.right > rect2.right && rect1.bottom > rect2.top && rect1.top < rect2.bottom);
    }

    /* rect1 is below of rect2 */
    function isBelow(rect1, rect2) {
      return rect1.top >= rect2.bottom || (rect1.top >= rect2.top && rect1.bottom > rect2.bottom && rect1.left < rect2.right && rect1.right > rect2.left);
    }

    /* rect1 is completely aligned or partially aligned for the direction */
    function isAligned(rect1, rect2, dir) {
      switch (dir) {
      case 'left' :
        /* falls through */
      case 'right' :
        return rect1.bottom > rect2.top && rect1.top < rect2.bottom;
      case 'up' :
        /* falls through */
      case 'down' :
        return rect1.right > rect2.left && rect1.left < rect2.right;
      default:
        return false;
      }
    }

    /**
     * Get distance between the search origin and a candidate element along the direction when candidate element is inside the search origin.
     * @see {@link https://drafts.csswg.org/css-nav-1/#find-the-shortest-distance}
     * @function getDistanceFromPoint
     * @param point {Point} - The search origin
     * @param element {DOMRect} - A candidate element
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {Number} The euclidian distance between the spatial navigation container and an element inside it
     */
    function getDistanceFromPoint(point, element, dir) {
      point = startingPoint;
      // Get exit point, entry point -> {x: '', y: ''};
      const points = getEntryAndExitPoints(dir, point, element);

      // Find the points P1 inside the border box of starting point and P2 inside the border box of candidate
      // that minimize the distance between these two points
      const P1 = Math.abs(points.entryPoint.x - points.exitPoint.x);
      const P2 = Math.abs(points.entryPoint.y - points.exitPoint.y);

      // The result is euclidian distance between P1 and P2.
      return Math.sqrt(Math.pow(P1, 2) + Math.pow(P2, 2));
    }

    /**
     * Get distance between the search origin and a candidate element along the direction when candidate element is inside the search origin.
     * @see {@link https://drafts.csswg.org/css-nav-1/#find-the-shortest-distance}
     * @function getInnerDistance
     * @param rect1 {DOMRect} - The search origin
     * @param rect2 {DOMRect} - A candidate element
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {Number} The euclidean distance between the spatial navigation container and an element inside it
     */
    function getInnerDistance(rect1, rect2, dir) {
      const baseEdgeForEachDirection = {left: 'right', right: 'left', up: 'bottom', down: 'top'};
      const baseEdge = baseEdgeForEachDirection[dir];

      return Math.abs(rect1[baseEdge] - rect2[baseEdge]);
    }

    /**
     * Get the distance between the search origin and a candidate element considering the direction.
     * @see {@link https://drafts.csswg.org/css-nav-1/#calculating-the-distance}
     * @function getDistance
     * @param searchOrigin {DOMRect | Point} - The search origin
     * @param candidateRect {DOMRect} - A candidate element
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {Number} The distance scoring between two elements
     */
    function getDistance(searchOrigin, candidateRect, dir) {
      const kOrthogonalWeightForLeftRight = 30;
      const kOrthogonalWeightForUpDown = 2;

      let orthogonalBias = 0;
      let alignBias = 0;
      const alignWeight = 5.0;

      // Get exit point, entry point -> {x: '', y: ''};
      const points = getEntryAndExitPoints(dir, searchOrigin, candidateRect);

      // Find the points P1 inside the border box of starting point and P2 inside the border box of candidate
      // that minimize the distance between these two points
      const P1 = Math.abs(points.entryPoint.x - points.exitPoint.x);
      const P2 = Math.abs(points.entryPoint.y - points.exitPoint.y);

      // A: The euclidean distance between P1 and P2.
      const A = Math.sqrt(Math.pow(P1, 2) + Math.pow(P2, 2));
      let B, C;

      // B: The absolute distance in the direction which is orthogonal to dir between P1 and P2, or 0 if dir is null.
      // C: The intersection edges between a candidate and the starting point.

      // D: The square root of the area of intersection between the border boxes of candidate and starting point
      const intersectionRect = getIntersectionRect(searchOrigin, candidateRect);
      const D = intersectionRect.area;

      switch (dir) {
      case 'left':
        /* falls through */
      case 'right' :
        // If two elements are aligned, add align bias
        // else, add orthogonal bias
        if (isAligned(searchOrigin, candidateRect, dir))
          alignBias = Math.min(intersectionRect.height / searchOrigin.height , 1);
        else
          orthogonalBias = (searchOrigin.height / 2);

        B = (P2 + orthogonalBias) * kOrthogonalWeightForLeftRight;
        C = alignWeight * alignBias;
        break;

      case 'up' :
        /* falls through */
      case 'down' :
        // If two elements are aligned, add align bias
        // else, add orthogonal bias
        if (isAligned(searchOrigin, candidateRect, dir))
          alignBias = Math.min(intersectionRect.width / searchOrigin.width , 1);
        else
          orthogonalBias = (searchOrigin.width / 2);

        B = (P1 + orthogonalBias) * kOrthogonalWeightForUpDown;
        C = alignWeight * alignBias;
        break;

      default:
        B = 0;
        C = 0;
        break;
      }

      return (A + B - C - D);
    }

    /**
     * Get the euclidean distance between the search origin and a candidate element considering the direction.
     * @function getEuclideanDistance
     * @param rect1 {DOMRect} - The search origin
     * @param rect2 {DOMRect} - A candidate element
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {Number} The distance scoring between two elements
     */
    function getEuclideanDistance(rect1, rect2, dir) {
      // Get exit point, entry point
      const points = getEntryAndExitPoints(dir, rect1, rect2);

      // Find the points P1 inside the border box of starting point and P2 inside the border box of candidate
      // that minimize the distance between these two points
      const P1 = Math.abs(points.entryPoint.x - points.exitPoint.x);
      const P2 = Math.abs(points.entryPoint.y - points.exitPoint.y);

      // Return the euclidean distance between P1 and P2.
      return Math.sqrt(Math.pow(P1, 2) + Math.pow(P2, 2));
    }

    /**
     * Get the absolute distance between the search origin and a candidate element considering the direction.
     * @function getAbsoluteDistance
     * @param rect1 {DOMRect} - The search origin
     * @param rect2 {DOMRect} - A candidate element
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD)
     * @returns {Number} The distance scoring between two elements
     */
    function getAbsoluteDistance(rect1, rect2, dir) {
      // Get exit point, entry point
      const points = getEntryAndExitPoints(dir, rect1, rect2);

      // Return the absolute distance in the dir direction between P1 and P.
      return ((dir === 'left') || (dir === 'right')) ?
        Math.abs(points.entryPoint.x - points.exitPoint.x) : Math.abs(points.entryPoint.y - points.exitPoint.y);
    }

    /**
     * Get entry point and exit point of two elements considering the direction.
     * @function getEntryAndExitPoints
     * @param dir {SpatialNavigationDirection} - The directional information for the spatial navigation (e.g. LRUD). Default value for dir is 'down'.
     * @param searchOrigin {DOMRect | Point} - The search origin which contains the exit point
     * @param candidateRect {DOMRect} - One of candidates which contains the entry point
     * @returns {Points} The exit point from the search origin and the entry point from a candidate
     */
    function getEntryAndExitPoints(dir = 'down', searchOrigin, candidateRect) {
      /**
       * User type definition for Point
       * @typeof {Object} Points
       * @property {Point} Points.entryPoint
       * @property {Point} Points.exitPoint
       */
      const points = {entryPoint: {x: 0, y: 0}, exitPoint:{x: 0, y: 0}};

      if (startingPoint) {
        points.exitPoint = searchOrigin;

        switch (dir) {
        case 'left':
          points.entryPoint.x = candidateRect.right;
          break;
        case 'up':
          points.entryPoint.y = candidateRect.bottom;
          break;
        case 'right':
          points.entryPoint.x = candidateRect.left;
          break;
        case 'down':
          points.entryPoint.y = candidateRect.top;
          break;
        }

        // Set orthogonal direction
        switch (dir) {
        case 'left':
        case 'right':
          if (startingPoint.y <= candidateRect.top) {
            points.entryPoint.y = candidateRect.top;
          } else if (startingPoint.y < candidateRect.bottom) {
            points.entryPoint.y = startingPoint.y;
          } else {
            points.entryPoint.y = candidateRect.bottom;
          }
          break;

        case 'up':
        case 'down':
          if (startingPoint.x <= candidateRect.left) {
            points.entryPoint.x = candidateRect.left;
          } else if (startingPoint.x < candidateRect.right) {
            points.entryPoint.x = startingPoint.x;
          } else {
            points.entryPoint.x = candidateRect.right;
          }
          break;
        }
      }
      else {
        // Set direction
        switch (dir) {
        case 'left':
          points.exitPoint.x = searchOrigin.left;
          points.entryPoint.x = (candidateRect.right < searchOrigin.left) ? candidateRect.right : searchOrigin.left;
          break;
        case 'up':
          points.exitPoint.y = searchOrigin.top;
          points.entryPoint.y = (candidateRect.bottom < searchOrigin.top) ? candidateRect.bottom : searchOrigin.top;
          break;
        case 'right':
          points.exitPoint.x = searchOrigin.right;
          points.entryPoint.x = (candidateRect.left > searchOrigin.right) ? candidateRect.left : searchOrigin.right;
          break;
        case 'down':
          points.exitPoint.y = searchOrigin.bottom;
          points.entryPoint.y = (candidateRect.top > searchOrigin.bottom) ? candidateRect.top : searchOrigin.bottom;
          break;
        }

        // Set orthogonal direction
        switch (dir) {
        case 'left':
        case 'right':
          if (isBelow(searchOrigin, candidateRect)) {
            points.exitPoint.y = searchOrigin.top;
            points.entryPoint.y = (candidateRect.bottom < searchOrigin.top) ? candidateRect.bottom : searchOrigin.top;
          } else if (isBelow(candidateRect, searchOrigin)) {
            points.exitPoint.y = searchOrigin.bottom;
            points.entryPoint.y = (candidateRect.top > searchOrigin.bottom) ? candidateRect.top : searchOrigin.bottom;
          } else {
            points.exitPoint.y = Math.max(searchOrigin.top, candidateRect.top);
            points.entryPoint.y = points.exitPoint.y;
          }
          break;

        case 'up':
        case 'down':
          if (isRightSide(searchOrigin, candidateRect)) {
            points.exitPoint.x = searchOrigin.left;
            points.entryPoint.x = (candidateRect.right < searchOrigin.left) ? candidateRect.right : searchOrigin.left;
          } else if (isRightSide(candidateRect, searchOrigin)) {
            points.exitPoint.x = searchOrigin.right;
            points.entryPoint.x = (candidateRect.left > searchOrigin.right) ? candidateRect.left : searchOrigin.right;
          } else {
            points.exitPoint.x = Math.max(searchOrigin.left, candidateRect.left);
            points.entryPoint.x = points.exitPoint.x;
          }
          break;
        }
      }

      return points;
    }

    /**
     * Find focusable elements within the container
     * @see {@link https://drafts.csswg.org/css-nav-1/#find-the-shortest-distance}
     * @function getIntersectionRect
     * @param rect1 {DOMRect} - The search origin which contains the exit point
     * @param rect2 {DOMRect} - One of candidates which contains the entry point
     * @returns {IntersectionArea} The intersection area between two elements.
     *
     * @typeof {Object} IntersectionArea
     * @property {Number} IntersectionArea.width
     * @property {Number} IntersectionArea.height
     */
    function getIntersectionRect(rect1, rect2) {
      const intersection_rect = {width: 0, height: 0, area: 0};

      const new_location = [Math.max(rect1.left, rect2.left), Math.max(rect1.top, rect2.top)];
      const new_max_point = [Math.min(rect1.right, rect2.right), Math.min(rect1.bottom, rect2.bottom)];

      intersection_rect.width = Math.abs(new_location[0] - new_max_point[0]);
      intersection_rect.height = Math.abs(new_location[1] - new_max_point[1]);

      if (!(new_location[0] >= new_max_point[0] || new_location[1] >= new_max_point[1])) {
        // intersecting-cases
        intersection_rect.area = Math.sqrt(intersection_rect.width * intersection_rect.height);
      }

      return intersection_rect;
    }

    /**
     * Handle the spatial navigation behavior for HTMLInputElement, HTMLTextAreaElement
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input|HTMLInputElement (MDN)}
     * @function handlingEditableElement
     * @param e {Event} - keydownEvent
     * @returns {boolean}
     */
    function handlingEditableElement(e) {
      const SPINNABLE_INPUT_TYPES = ['email', 'date', 'month', 'number', 'time', 'week'],
        TEXT_INPUT_TYPES = ['password', 'text', 'search', 'tel', 'url', null];
      const eventTarget = document.activeElement;
      const startPosition = eventTarget.selectionStart;
      const endPosition = eventTarget.selectionEnd;
      const focusNavigableArrowKey = {left: false, up: false, right: false, down: false};

      const dir = ARROW_KEY_CODE[e.keyCode];
      if (dir === undefined) {
        return focusNavigableArrowKey;
      }

      if (SPINNABLE_INPUT_TYPES.includes(eventTarget.getAttribute('type')) &&
        (dir === 'up' || dir === 'down')) {
        focusNavigableArrowKey[dir] = true;
      } else if (TEXT_INPUT_TYPES.includes(eventTarget.getAttribute('type')) || eventTarget.nodeName === 'TEXTAREA') {
        if (startPosition === endPosition) { // if there isn't any selected text
          if (startPosition === 0) {
            focusNavigableArrowKey.left = true;
            focusNavigableArrowKey.up = true;
          }
          if (endPosition === eventTarget.value.length) {
            focusNavigableArrowKey.right = true;
            focusNavigableArrowKey.down = true;
          }
        }
      } else { // HTMLDataListElement, HTMLSelectElement, HTMLOptGroup
        focusNavigableArrowKey[dir] = true;
      }

      return focusNavigableArrowKey;
    }

    /**
     * Get the DOMRect of an element
     * @function getBoundingClientRect
     * @param {Node} element 
     * @returns {DOMRect}
     */
    function getBoundingClientRect(element) {
      // memoization
      let rect = mapOfBoundRect && mapOfBoundRect.get(element);
      if (!rect) {
        const boundingClientRect = element.getBoundingClientRect();
        rect = {
          top: Number(boundingClientRect.top.toFixed(2)),
          right: Number(boundingClientRect.right.toFixed(2)),
          bottom: Number(boundingClientRect.bottom.toFixed(2)),
          left: Number(boundingClientRect.left.toFixed(2)),
          width: Number(boundingClientRect.width.toFixed(2)),
          height: Number(boundingClientRect.height.toFixed(2))
        };
        mapOfBoundRect && mapOfBoundRect.set(element, rect);
      }
      return rect;
    }

    /**
     * Get the candidates which is fully inside the target element in visual
     * @param {Node} targetElement
     * @returns {sequence<Node>}  overlappedCandidates
     */
    function getOverlappedCandidates(targetElement) {      
      const container = targetElement.getSpatialNavigationContainer();
      const candidates = container.focusableAreas();
      const overlappedCandidates = [];

      candidates.forEach(element => {
        if ((targetElement !== element) && isEntirelyVisible(element, targetElement)) {
          overlappedCandidates.push(element);
        }
      });

      return overlappedCandidates;
    }

    /**
     * Get the list of the experimental APIs
     * @function getExperimentalAPI
     */
    function getExperimentalAPI() {
      function canScroll(container, dir) {
        return (isScrollable(container, dir) && !isScrollBoundary(container, dir)) ||
               (!container.parentElement && !isHTMLScrollBoundary(container, dir));
      }

      function findTarget(findCandidate, element, dir, option) {
        let eventTarget = element;
        let bestNextTarget = null;

        // 4
        if (eventTarget === document || eventTarget === document.documentElement) {
          eventTarget = document.body || document.documentElement;
        }

        // 5
        // At this point, spatialNavigationSearch can be applied.
        // If startingPoint is either a scroll container or the document,
        // find the best candidate within startingPoint
        if ((isContainer(eventTarget) || eventTarget.nodeName === 'BODY') && !(eventTarget.nodeName === 'INPUT')) {
          if (eventTarget.nodeName === 'IFRAME')
            eventTarget = eventTarget.contentDocument.body;

          const candidates = getSpatialNavigationCandidates(eventTarget, option);

          // 5-2
          if (Array.isArray(candidates) && candidates.length > 0) {
            return findCandidate ? getFilteredSpatialNavigationCandidates(eventTarget, dir, candidates) : eventTarget.spatialNavigationSearch(dir, {candidates});
          }
          if (canScroll(eventTarget, dir)) {
            return findCandidate ? [] : eventTarget;
          }
        }

        // 6
        // Let container be the nearest ancestor of eventTarget
        let container = eventTarget.getSpatialNavigationContainer();
        let parentContainer = (container.parentElement) ? container.getSpatialNavigationContainer() : null;

        // When the container is the viewport of a browsing context
        if (!parentContainer && ( window.location !== window.parent.location)) {
          parentContainer = window.parent.document.documentElement;
        }

        // 7
        while (parentContainer) {
          const candidates = filteredCandidates(eventTarget, getSpatialNavigationCandidates(container, option), dir, container);

          if (Array.isArray(candidates) && candidates.length > 0) {
            bestNextTarget = eventTarget.spatialNavigationSearch(dir, {candidates, container});
            if (bestNextTarget) {
              return findCandidate ? candidates : bestNextTarget;
            }
          }

          // If there isn't any candidate and the best candidate among candidate:
          // 1) Scroll or 2) Find candidates of the ancestor container
          // 8 - if
          else if (canScroll(container, dir)) {
            return findCandidate ? [] : eventTarget;
          } else if (container === document || container === document.documentElement) {
            container = window.document.documentElement;

            // The page is in an iframe
            if ( window.location !== window.parent.location ) {
              // eventTarget needs to be reset because the position of the element in the IFRAME
              // is unuseful when the focus moves out of the iframe
              eventTarget = window.frameElement;
              container = window.parent.document.documentElement;
              if (container.parentElement)
                parentContainer = container.getSpatialNavigationContainer();
              else {
                parentContainer = null;
                break;
              }
            }
          } else {
            // avoiding when spatnav container with tabindex=-1
            if (isFocusable(container)) {
              eventTarget = container;
            }

            container = parentContainer;
            if (container.parentElement)
              parentContainer = container.getSpatialNavigationContainer();
            else {
              parentContainer = null;
              break;
            }
          }
        }

        if (!parentContainer && container) {
          // Getting out from the current spatnav container
          const candidates = filteredCandidates(eventTarget, getSpatialNavigationCandidates(container, option), dir, container);

          // 9
          if (Array.isArray(candidates) && candidates.length > 0) {
            bestNextTarget = eventTarget.spatialNavigationSearch(dir, {candidates, container});
            if (bestNextTarget) {
              return findCandidate ? candidates : bestNextTarget;
            }
          }
        }

        if (canScroll(container, dir)) {
          bestNextTarget = eventTarget;
          return bestNextTarget;
        }
      }

      return {
        isContainer,
        isScrollContainer,
        isVisibleInScroller,
        findCandidates: findTarget.bind(null, true),
        findNextTarget: findTarget.bind(null, false),
        getDistanceFromTarget: (element, candidateElement, dir) => {
          if ((isContainer(element) || element.nodeName === 'BODY') && !(element.nodeName === 'INPUT')) {
            if (getSpatialNavigationCandidates(element).includes(candidateElement)) {
              return getInnerDistance(getBoundingClientRect(element), getBoundingClientRect(candidateElement), dir);
            }
          }
          return getDistance(getBoundingClientRect(element), getBoundingClientRect(candidateElement), dir);
        }
      };
    }

    /**
     * Makes to use the experimental APIs.
     * @function enableExperimentalAPIs
     * @param option {boolean} - If it is true, the experimental APIs can be used or it cannot.
     */
    function enableExperimentalAPIs (option) {
      const currentKeyMode = window.__spatialNavigation__ && window.__spatialNavigation__.keyMode;
      window.__spatialNavigation__ = (option === false) ? getInitialAPIs() : Object.assign(getInitialAPIs(), getExperimentalAPI());
      window.__spatialNavigation__.keyMode = currentKeyMode;
      Object.seal(window.__spatialNavigation__);
    }

    /**
     * Set the environment for using the spatial navigation polyfill.
     * @function getInitialAPIs
     */
    function getInitialAPIs() {
      return {
        enableExperimentalAPIs,
        get keyMode() { return this._keymode ? this._keymode : 'ARROW'; },
        set keyMode(mode) { this._keymode = (['SHIFTARROW', 'ARROW', 'NONE'].includes(mode)) ? mode : 'ARROW'; },
        setStartingPoint: function (x, y) {startingPoint = (x && y) ? {x, y} : null;}
      };
    }

    initiateSpatialNavigation();
    enableExperimentalAPIs(false);
    
    window.addEventListener('load', () => {
      spatialNavigationHandler();
    });
  })();

  /**
   * spatialNav.js
   * Anbindung des W3C Spatial Navigation Polyfills mit Fokus auf maximale TV-Performance.
   * Beinhaltet eine direkte Brücke im Header, um zuverlässig zum Benutzerprofil (.dd / .avatar) zu navigieren.
   */


  let enterKeyHandler = null;
  let directionalBridgeHandler = null;

  /**
   * Setzt den Anfangsfokus schnell auf das erste sichtbare Hauptelement.
   */
  function setInitialFocus() {
    try {
      if (
        document.activeElement &&
        document.activeElement !== document.body &&
        document.activeElement !== document.documentElement
      ) {
        return;
      }

      const candidate =
        document.querySelector(".primary-navigation a") ||
        document.querySelector(".coverListItem a") ||
        document.querySelector(".homeContentPromotionBoxPicture a") ||
        document.querySelector("a[href]");

      if (candidate && typeof candidate.focus === "function") {
        candidate.focus();
        Logger.info("Initialer TV-Fokus gesetzt auf:", candidate);
      }
    } catch (e) {
      Logger.warn("Konnte initialen Fokus nicht setzen:", e);
    }
  }

  /**
   * Initialisiert die Spatial Navigation und Header-Navigations-Brücken.
   */
  function initSpatialNav() {
    if (window.__spatialNavigation__) {
      try {
        window.__spatialNavigation__.keyMode = "ARROW";
      } catch (e) {}
    }

    // 1. Polyfill-Load-Event triggern
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      try {
        window.dispatchEvent(new Event("load"));
      } catch (e) {}
    }

    // 2. Header-Brücken-Handler: Stellt sicher, dass Pfeil-Rechts von 'mehr' zum User-Profil führt
    directionalBridgeHandler = (event) => {
      if (isCursorActive()) return;

      const active = document.activeElement;
      if (!active) return;

      // A. Von 'mehr' nach RECHTS -> Direkt zur User-Leiste (Suche / Avatar / Name)
      if (event.key === "ArrowRight" || event.keyCode === KEY_CODES.ARROW_RIGHT) {
        if (
          active.matches(
            ".primary-navigation > ul > li:last-child, .primary-navigation > ul > li:last-child *",
          )
        ) {
          const target =
            document.querySelector(".menuSearchButton") ||
            document.querySelector(".avatar a") ||
            document.querySelector(".dd > p > a, .dd p a");

          if (target) {
            event.preventDefault();
            target.focus();
            Logger.info("[Nav Bridge] Von 'mehr' direkt zur User-Leiste:", target);
            return;
          }
        }
      }

      // B. Von User-Leiste nach LINKS -> Zurück zu 'mehr'
      if (event.key === "ArrowLeft" || event.keyCode === KEY_CODES.ARROW_LEFT) {
        if (active.matches(".menuSearchButton, .liveNewsFeedButton, .avatar a")) {
          const moreBtn = document.querySelector(
            ".primary-navigation > ul > li:last-child > strong, .primary-navigation > ul > li:last-child a",
          );
          if (moreBtn) {
            event.preventDefault();
            moreBtn.focus();
            Logger.info("[Nav Bridge] Von User-Leiste nach links zu 'mehr':", moreBtn);
            return;
          }
        }
      }

      // C. Vom Username (.dd p a) nach UNTEN -> Menü öffnen und ersten Link fokussieren
      if (event.key === "ArrowDown" || event.keyCode === KEY_CODES.ARROW_DOWN) {
        const ddContainer = active.closest(".dd");
        if (ddContainer) {
          ddContainer.classList.add(APP_CONFIG.MENU_OPEN_CLASS);
          const firstLink = ddContainer.querySelector(".modal ul li a");
          if (firstLink) {
            event.preventDefault();
            firstLink.focus();
            Logger.info("[Nav Bridge] Im User-Menü zu erstem Link navigiert:", firstLink);
            return;
          }
        }
      }

      // D. Vom ersten User-Menü-Eintrag nach OBEN -> Zurück zum User-Trigger
      if (event.key === "ArrowUp" || event.keyCode === KEY_CODES.ARROW_UP) {
        const firstModalLi = active.closest(".modal ul li:first-child");
        if (firstModalLi) {
          const ddTrigger = document.querySelector(".dd > p > a, .dd p a");
          if (ddTrigger) {
            event.preventDefault();
            ddTrigger.focus();
            Logger.info("[Nav Bridge] Zurück zum Username-Trigger:", ddTrigger);
            return;
          }
        }
      }
    };

    // 3. Enter-Key-Handler für Nicht-Standard-Buttons (z. B. Karussell-Pfeile span[data-action])
    enterKeyHandler = (event) => {
      if (isCursorActive()) return;

      if (event.keyCode === KEY_CODES.ENTER || event.key === "Enter") {
        const active = document.activeElement;
        if (
          active &&
          active !== document.body &&
          active.tagName !== "INPUT" &&
          active.tagName !== "TEXTAREA"
        ) {
          if (active.tagName !== "A" && active.tagName !== "BUTTON") {
            active.click();
            event.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", directionalBridgeHandler, true);
    window.addEventListener("keydown", enterKeyHandler, true);

    setTimeout(setInitialFocus, 250);

    Logger.info("Spatial Navigation (inkl. Header-Brücke) aktiv.");
  }

  function cleanupSpatialNav() {
    if (directionalBridgeHandler) {
      window.removeEventListener("keydown", directionalBridgeHandler, true);
      directionalBridgeHandler = null;
    }

    if (enterKeyHandler) {
      window.removeEventListener("keydown", enterKeyHandler, true);
      enterKeyHandler = null;
    }

    if (window.__spatialNavigation__) {
      try {
        window.__spatialNavigation__.keyMode = "NONE";
      } catch (e) {}
    }

    Logger.info("Spatial Navigation aufgeräumt und deaktiviert.");
  }

  /**
   * adBlocker.js
   * Performanter Schutz vor Popups, Popundern und ungewollten Weiterleitungen beim Abspielen von Videos.
   * Verhindert strikt das Öffnen neuer Tabs, damit die TizenBrew-Umgebung nicht verlassen wird.
   */


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

  function initAdBlocker() {
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

  function cleanupAdBlocker() {
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

  /**
   * index.js
   * Haupt-Entrypoint für das injizierte TizenBrew AniWorld TV Modul.
   * Koordiniert Initialisierung, Module, VirtualCursor und Lifecycle-Cleanup.
   *
   * SICHERHEIT: Läuft ausschließlich auf aniworld.to!
   */


  (() => {
    const hostname = window.location.hostname;
    if (!hostname || !hostname.includes("aniworld.to")) {
      return;
    }

    window.SCRIPT_VERSION = APP_CONFIG.VERSION;

    function init() {
      if (!window.location.hostname.includes("aniworld.to")) {
        return;
      }

      if (window.__ANIWORLD_INITIALIZED__) {
        Logger.warn("Bereits initialisiert.");
        return;
      }

      try {
        Logger.info(`Initialisiere ${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}...`);

        // 1. Popup- & Tab-Schutz (Verhindert neue Tabs und Werbe-Redirects)
        initAdBlocker();

        // 2. High-Visibility Fokus-Styles injizieren (Header containment)
        injectFocusStyles();

        // 3. DOM-Elemente augmentieren (Tabindex & target="_blank" Bereinigung)
        initDomEnhancer();

        // 4. Dropdown- und Menüsteuerung aktivieren
        initMenuController();

        // 5. Virtuellen Mauszeiger bereitstellen (Rote Taste)
        initVirtualCursor();

        // 6. Zurück-Taste (Tizen HW Key, Cursor & Root-Exit) einrichten
        initBackButton();

        // 7. W3C Spatial Navigation starten (inkl. Header-Brücke zum User-Profil)
        initSpatialNav();

        window.__ANIWORLD_INITIALIZED__ = true;
        Logger.info(`${APP_CONFIG.NAME} erfolgreich gestartet.`);
      } catch (error) {
        Logger.error("Kritischer Fehler bei der Initialisierung:", error);
      }
    }

    function uninit() {
      if (!window.__ANIWORLD_INITIALIZED__) {
        return;
      }

      try {
        Logger.info(`Beende ${APP_CONFIG.NAME}...`);

        cleanupSpatialNav();
        cleanupBackButton();
        cleanupVirtualCursor();
        cleanupMenuController();
        cleanupDomEnhancer();
        cleanupAdBlocker();
        removeFocusStyles();

        window.__ANIWORLD_INITIALIZED__ = false;
        Logger.info(`${APP_CONFIG.NAME} vollständig aufgeräumt.`);
      } catch (error) {
        Logger.error("Fehler beim Cleanup:", error);
      }
    }

    // Globale Lifecycle-Hooks für den TizenBrew Loader
    window.__ANIWORLD_INIT__ = init;
    window.__ANIWORLD_UNINIT__ = uninit;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(init, 150), {
        once: true,
      });
    } else {
      setTimeout(init, 150);
    }

    setTimeout(() => {
      if (!window.__ANIWORLD_INITIALIZED__) {
        init();
      }
    }, 2000);
  })();

})();
