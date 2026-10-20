/**
 * constants.js
 * Zentrale Konfigurationskonstanten für das AniWorld Tizen TV Script.
 */

export const APP_CONFIG = {
  NAME: "AniWorld TV",
  VERSION: "1.0.8",
  STORAGE_CACHE_KEY: "aniworld_script_cache",
  STORAGE_SESSION_KEY: "aniworld_loaded",
  FOCUS_CLASS: "tv-focused",
  MENU_OPEN_CLASS: "tv-menu-open",
  FOCUS_COLOR: "#FF6600",
};

export const INTERACTIVE_AUGMENT_SELECTORS = [
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

export const KEY_CODES = {
  ENTER: 13,
  ESCAPE: 27,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
  // Rote Farbtaste
  RED_KEY: 403,
  // Tizen HW Back / Return
  TIZEN_BACK: 10009,
};
