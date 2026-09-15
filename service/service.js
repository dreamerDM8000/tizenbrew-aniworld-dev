try {
  // Media control keys
  tizen.tvinputdevice.registerKey("MediaPlayPause");
  tizen.tvinputdevice.registerKey("MediaPlay");
  tizen.tvinputdevice.registerKey("MediaPause");
  tizen.tvinputdevice.registerKey("MediaStop");
  tizen.tvinputdevice.registerKey("MediaFastForward");
  tizen.tvinputdevice.registerKey("MediaRewind");
  tizen.tvinputdevice.registerKey("MediaTrackNext");
  tizen.tvinputdevice.registerKey("MediaTrackPrevious");

  // Navigation and control keys
  tizen.tvinputdevice.registerKey("Back");
  tizen.tvinputdevice.registerKey("Enter");
  tizen.tvinputdevice.registerKey("ArrowUp");
  tizen.tvinputdevice.registerKey("ArrowDown");
  tizen.tvinputdevice.registerKey("ArrowLeft");
  tizen.tvinputdevice.registerKey("ArrowRight");

  tizen.tvinputdevice.registerKey("ColorF0Red");
} catch (e) {
  // Silent error handling - no console logs
}
