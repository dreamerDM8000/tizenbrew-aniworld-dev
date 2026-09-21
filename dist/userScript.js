(function () {
  'use strict';

  // mods/cursor.js — Maus-Cursor-Modus für TV-Fernbedienung
  (function () {
    const STEP = 18; // Pixel pro Tastendruck
    const CURSOR_ID = "tv-cursor";
    const STORAGE_KEY = "aniworld_cursor_mode";

    let active = false;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let lastHoverEl = null;
    let lastForcedLi = null;
    let cursorEl = null;

    function injectForcedHoverCSS() {
      const style = document.createElement("style");
      style.textContent = `
      .primary-navigation > ul > li.forced-hover ul {
        display: block;
        position: absolute;
        overflow: hidden;
        width: 150px;
        border-radius: 5px;
        padding-top: 15px;
        z-index: 5;
        left: -25px;
      }
    `;
      document.head.appendChild(style);
    }

    function createCursor() {
      cursorEl = document.createElement("div");
      cursorEl.id = CURSOR_ID;
      cursorEl.style.cssText = [
        "position: fixed",
        "width: 0",
        "height: 0",
        "border-left: 12px solid transparent",
        "border-right: 12px solid transparent",
        "border-top: 20px solid #FF6600",
        "transform: rotate(-45deg)",
        "z-index: 2147483647",
        "pointer-events: none",
        "left: 0px",
        "top: 0px",
        "filter: drop-shadow(0 0 3px rgba(0,0,0,0.8))",
      ].join(";");
      document.body.appendChild(cursorEl);
      updatePosition();
    }

    function updatePosition() {
      if (!cursorEl) return;
      cursorEl.style.left = x + "px";
      cursorEl.style.top = y + "px";
    }

    function fireMouseEvent(type, el, opts) {
      if (!el) return;
      const ev = new MouseEvent(
        type,
        Object.assign(
          {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
          },
          opts || {},
        ),
      );
      el.dispatchEvent(ev);
    }

    function updateForcedHover(el) {
      const li = el ? el.closest(".primary-navigation > ul > li") : null;
      if (li === lastForcedLi) return;
      if (lastForcedLi) lastForcedLi.classList.remove("forced-hover");
      if (li) li.classList.add("forced-hover");
      lastForcedLi = li;
    }

    function updateHover() {
      cursorEl.style.display = "none";
      const el = document.elementFromPoint(x, y);
      cursorEl.style.display = "";
      if (el === lastHoverEl) return;
      if (lastHoverEl) {
        fireMouseEvent("mouseout", lastHoverEl);
        fireMouseEvent("mouseleave", lastHoverEl, { bubbles: false });
      }
      if (el) {
        fireMouseEvent("mouseover", el);
        fireMouseEvent("mouseenter", el, { bubbles: false });
      }
      lastHoverEl = el;
      updateForcedHover(el);
    }

    function moveCursor(dx, dy) {
      x = Math.max(0, Math.min(window.innerWidth - 1, x + dx));
      y = Math.max(0, Math.min(window.innerHeight - 1, y + dy));
      updatePosition();
      updateHover();
    }

    function click() {
      cursorEl.style.display = "none";
      const el = document.elementFromPoint(x, y);
      cursorEl.style.display = "";
      if (!el) return;
      fireMouseEvent("mousedown", el);
      fireMouseEvent("mouseup", el);
      fireMouseEvent("click", el);
    }

    function setActive(state) {
      active = state;
      window.__cursorModeActive = active; // von navigation.js abfragbar
      localStorage.setItem(STORAGE_KEY, active ? "1" : "0");
      if (active) {
        if (!cursorEl) createCursor();
        cursorEl.style.display = "";
        updateHover();
      } else if (cursorEl) {
        cursorEl.style.display = "none";
        if (lastHoverEl) {
          fireMouseEvent("mouseout", lastHoverEl);
          fireMouseEvent("mouseleave", lastHoverEl, { bubbles: false });
          lastHoverEl = null;
        }
        if (lastForcedLi) {
          lastForcedLi.classList.remove("forced-hover");
          lastForcedLi = null;
        }
      }
    }

    function onKeyDown(e) {
      if (e.key === "XF86Red" || e.keyCode === 403) {
        setActive(!active);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (!active) return; // sonst normale Fokus-Navigation laufen lassen

      switch (e.key) {
        case "ArrowUp":
          moveCursor(0, -STEP);
          break;
        case "ArrowDown":
          moveCursor(0, STEP);
          break;
        case "ArrowLeft":
          moveCursor(-STEP, 0);
          break;
        case "ArrowRight":
          moveCursor(STEP, 0);
          break;
        case "Enter":
          click();
          break;
        case "Back":
        case "XF86Back":
          setActive(false);
          break;
        default:
          return; // andere Tasten nicht blockieren
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    injectForcedHoverCSS();
    document.addEventListener("keydown", onKeyDown, true);
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setActive(true);
    }
  })();

  // mods/keylogger.js — NUR zum Testen, danach wieder aus userScript.js entfernen
  (function () {
    function toast(msg) {
      const el = document.createElement("div");
      el.textContent = msg;
      el.style.cssText = [
        "position: fixed",
        "bottom: 40px",
        "left: 50%",
        "transform: translateX(-50%)",
        "background: #FF6600",
        "color: #fff",
        "padding: 10px 24px",
        "border-radius: 8px",
        "font-size: 20px",
        "z-index: 2147483647",
        "opacity: 1",
        "transition: opacity 1s ease",
      ].join(";");
      document.body.appendChild(el);
      setTimeout(function () {
        el.style.opacity = "0";
        setTimeout(function () {
          el.remove();
        }, 1000);
      }, 3000);
    }

    document.addEventListener(
      "keydown",
      function (e) {
        toast("key=" + e.key + " code=" + e.code + " keyCode=" + e.keyCode);
      },
      true,
    );
  })();

  (() => {
    window.SCRIPT_VERSION = "1.0.10";

    let tizenHwKeyHandler = null;
    let clickHandler = null;
    let elementObserver = null;

    function removeBlockedElements() {
      document
        .querySelectorAll("iframe, a[target='_blank']")
        .forEach((element) => {
          element.remove();
        });
    }

    function init() {
      if (window.__ANIWORLD_NAV_INITIALIZED__) {
        return;
      }

      // Bereits vorhandene Elemente entfernen
      removeBlockedElements();

      // Neu eingefügte Elemente automatisch entfernen
      elementObserver = new MutationObserver(() => {
        removeBlockedElements();
      });

      if (document.documentElement) {
        elementObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      }

      // Tizen Zurück-Taste
      tizenHwKeyHandler = function (e) {
        if (e.keyName === "back") {
          if (window.history.length > 1) {
            window.history.back();
          } else if (typeof tizen !== "undefined") {
            tizen.application.getCurrentApplication().exit();
          }
        }
      };

      // target="_blank" abfangen
      clickHandler = function (e) {
        const a = e.target.closest("a[target='_blank']");

        if (!a) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        window.location.href = a.href;
      };

      window.addEventListener("tizenhwkey", tizenHwKeyHandler);

      document.addEventListener("click", clickHandler, true);

      window.__ANIWORLD_NAV_INITIALIZED__ = true;
    }

    function uninit() {
      if (!window.__ANIWORLD_NAV_INITIALIZED__) {
        return;
      }

      if (tizenHwKeyHandler) {
        window.removeEventListener("tizenhwkey", tizenHwKeyHandler);
        tizenHwKeyHandler = null;
      }

      if (clickHandler) {
        document.removeEventListener("click", clickHandler, true);
        clickHandler = null;
      }

      if (elementObserver) {
        elementObserver.disconnect();
        elementObserver = null;
      }

      window.__ANIWORLD_NAV_INITIALIZED__ = false;
    }

    window.__ANIWORLD_INIT__ = init;
    window.__ANIWORLD_UNINIT__ = uninit;

    function waitForPage() {
      if (window.__ANIWORLD_NAV_INITIALIZED__) {
        return;
      }

      if (document.readyState === "loading") {
        window.addEventListener(
          "DOMContentLoaded",
          () => {
            setTimeout(init, 500);
          },
          { once: true },
        );
      } else {
        setTimeout(init, 500);
      }

      // Fallback für den Fall, dass DOMContentLoaded
      // auf dem TV nicht zuverlässig ausgelöst wird.
      setTimeout(() => {
        if (!window.__ANIWORLD_NAV_INITIALIZED__) {
          init();
        }
      }, 10000);
    }

    waitForPage();
  })();

})();
