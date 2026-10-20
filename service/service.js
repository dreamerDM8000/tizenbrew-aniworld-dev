/**
 * service.js
 * TizenBrew Background Service für das AniWorld-Modul.
 *
 * Hintergrund & Vergleich zu TizenTube:
 * -------------------------------------
 * In TizenBrew läuft die Datei unter "serviceFile" im Node.js- bzw. Background-Service-Kontext
 * der Tizen-Anwendung.
 *
 * - In Projekten wie TizenTube (YouTube) betreibt der Service einen lokalen HTTP-Proxy-Server
 *   (auf localhost), um CORS-Einschränkungen zu umgehen und SponsorBlock-Daten bereitzustellen.
 * - Für AniWorld ist kein lokaler Proxy nötig, da die Medien-Streams direkt über die
 *   Website und Hoster geladen werden.
 * - Stattdessen stellt dieser Service sicher, dass alle erforderlichen TV-Hardware-Tasten
 *   (Media-Keys wie Play/Pause, Zurück-Taste, Farbtasten) auf OS-Ebene über die
 *   Tizen TVInputDevice-API registriert werden, sodass der Samsung-Fenstermanager
 *   diese Tasten zuverlässig an die Webansicht weiterleitet.
 */

(function () {
  const KEYS_TO_REGISTER = [
    // Media-Steuerung für HTML5-Video-Player
    "MediaPlayPause",
    "MediaPlay",
    "MediaPause",
    "MediaStop",
    "MediaFastForward",
    "MediaRewind",
    "MediaTrackNext",
    "MediaTrackPrevious",

    // Hardware-Zurück und Farbtasten
    "Back",
    "ColorF0Red",
    "ColorF1Green",
    "ColorF2Yellow",
    "ColorF3Blue",
  ];

  if (typeof tizen !== "undefined" && tizen.tvinputdevice && typeof tizen.tvinputdevice.registerKey === "function") {
    KEYS_TO_REGISTER.forEach(function (keyName) {
      try {
        tizen.tvinputdevice.registerKey(keyName);
      } catch (err) {
        // Einige Keys sind vom Tizen-System bereits nativ reserviert und werfen einen Fehler;
        // durch die Einzelschleife werden alle anderen Tasten dennoch erfolgreich registriert.
      }
    });
  }
})();
