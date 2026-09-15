export function createNavigation(config) {
  const {
    focusSelectors = [
      "a[href]",
      "button",
      "[tabindex]",
      "input",
      "select",
      "textarea",
    ],
    ringColor = "#FF6600",
    extraStyles = "",
    hoverToggles = [], // [{ toggle: "css", container: "css" }] - simuliert echtes :hover per Maus-Events
    sections = [{ name: "body", selector: null }],
  } = config || {};

  const FOCUS_CLASS = "tv-focus-ring";
  const SELECTORS = focusSelectors.join(",");
  const ROW_BAND = 24;

  const style = document.createElement("style");
  style.textContent = `
    .${FOCUS_CLASS} {
      outline: 4px solid ${ringColor} !important;
      outline-offset: 2px !important;
    }
    ${extraStyles}
  `;
  document.head.appendChild(style);

  let currentEl = null;

  function getFocusable() {
    return Array.from(document.querySelectorAll(SELECTORS)).filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        s.visibility !== "hidden" &&
        s.display !== "none" &&
        !el.disabled
      );
    });
  }

  function sectionIndex(el) {
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].selector && el.closest(sections[i].selector)) return i;
    }
    const fallback = sections.findIndex((s) => !s.selector);
    return fallback === -1 ? 0 : fallback;
  }

  function fireMouse(el, type) {
    const bubbles = type === "mouseover" || type === "mouseout";
    el.dispatchEvent(
      new MouseEvent(type, { bubbles, cancelable: true, view: window }),
    );
  }

  function updateHoverToggles(focusedEl) {
    const openNow = new Set();
    for (const cfg of hoverToggles) {
      if (focusedEl.matches(cfg.toggle)) {
        const container = focusedEl.closest(cfg.container);
        if (!container) continue;
        openNow.add(container);
        if (!container.dataset.tvHoverOpen) {
          container.dataset.tvHoverOpen = "1";
          fireMouse(container, "mouseenter");
          fireMouse(container, "mouseover");
        }
      }
    }
    document.querySelectorAll('[data-tv-hover-open="1"]').forEach((el) => {
      if (!openNow.has(el) && !el.contains(focusedEl)) {
        fireMouse(el, "mouseleave");
        fireMouse(el, "mouseout");
        delete el.dataset.tvHoverOpen;
      }
    });
  }

  function closeAllHoverToggles() {
    document.querySelectorAll('[data-tv-hover-open="1"]').forEach((el) => {
      fireMouse(el, "mouseleave");
      fireMouse(el, "mouseout");
      delete el.dataset.tvHoverOpen;
    });
  }

  function setFocus(el) {
    if (!el) return;
    if (currentEl) currentEl.classList.remove(FOCUS_CLASS);
    currentEl = el;
    currentEl.classList.add(FOCUS_CLASS);
    if (
      currentEl.tagName !== "A" &&
      currentEl.tagName !== "BUTTON" &&
      !currentEl.hasAttribute("tabindex")
    ) {
      currentEl.setAttribute("tabindex", "-1");
    }
    currentEl.focus({ preventScroll: false });
    currentEl.scrollIntoView({ block: "center", behavior: "smooth" });
    updateHoverToggles(currentEl);
  }

  function pickBest(candidates, cx, cy, direction) {
    let best = null;
    let bestScore = Infinity;
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;
      const dx = ex - cx;
      const dy = ey - cy;
      let valid = false,
        primary = 0,
        secondary = 0;

      if (direction === "ArrowRight") {
        valid = dx > 5;
        primary = dx;
        secondary = Math.abs(dy);
      } else if (direction === "ArrowLeft") {
        valid = dx < -5;
        primary = -dx;
        secondary = Math.abs(dy);
      } else if (direction === "ArrowDown") {
        valid = dy > 5;
        primary = dy;
        secondary = Math.abs(dx);
      } else if (direction === "ArrowUp") {
        valid = dy < -5;
        primary = -dy;
        secondary = Math.abs(dx);
      }
      if (!valid) continue;

      const score = primary + secondary * 2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function findNext(direction) {
    if (!currentEl) return getFocusable()[0];
    const cur = currentEl.getBoundingClientRect();
    const cx = cur.left + cur.width / 2;
    const cy = cur.top + cur.height / 2;
    const mySection = sectionIndex(currentEl);
    const all = getFocusable().filter((el) => el !== currentEl);
    const sameSection = all.filter((el) => sectionIndex(el) === mySection);

    if (direction === "ArrowLeft" || direction === "ArrowRight") {
      const sameRow = sameSection.filter((el) => {
        const r = el.getBoundingClientRect();
        const ey = r.top + r.height / 2;
        return Math.abs(ey - cy) <= ROW_BAND;
      });
      const rowBest = pickBest(sameRow, cx, cy, direction);
      if (rowBest) return rowBest;
    }

    const best = pickBest(sameSection, cx, cy, direction);
    if (best) return best;

    if (direction === "ArrowDown" || direction === "ArrowUp") {
      const targetIndex = mySection + (direction === "ArrowDown" ? 1 : -1);
      const target = sections[targetIndex];
      if (target) {
        const inTarget = all.filter((el) => sectionIndex(el) === targetIndex);
        if (inTarget.length) {
          let closest = inTarget[0];
          let closestDx = Infinity;
          for (const el of inTarget) {
            const r = el.getBoundingClientRect();
            const ex = r.left + r.width / 2;
            const dx = Math.abs(ex - cx);
            if (dx < closestDx) {
              closestDx = dx;
              closest = el;
            }
          }
          return closest;
        }
      }
    }
    return null;
  }

  function handleKey(e) {
    if (e.key === "Enter") {
      if (currentEl) currentEl.click();
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace" || e.key === "Escape") {
      if (document.querySelector('[data-tv-hover-open="1"]')) {
        closeAllHoverToggles();
        e.preventDefault();
        return;
      }
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
      return;
    const next = findNext(e.key);
    if (next) setFocus(next);
    e.preventDefault();
  }

  document.addEventListener("keydown", handleKey, true);

  function init() {
    const first = getFocusable()[0];
    if (first) setFocus(first);
  }

  if (document.readyState !== "loading") setTimeout(init, 300);
  else
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 300));

  new MutationObserver(() => {
    if (!currentEl || !document.body.contains(currentEl)) init();
  }).observe(document.body, { childList: true, subtree: true });

  return { getFocusable, setFocus };
}
