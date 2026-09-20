// mods/adblock.js — früh laden, VOR allen anderen Imports
(function () {
  window.open = function () {
    return null;
  }; // Popup/Popunder verhindern
  document.write = function () {}; // synchrones Ad-Injection verhindern
  document.writeln = function () {};
})();
