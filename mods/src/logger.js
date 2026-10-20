/**
 * logger.js
 * Sicheres Logging mit Prefix für einfaches Remote-Debugging auf Tizen Smart TVs.
 */

const PREFIX = "[AniWorld-TV]";

export const Logger = {
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

