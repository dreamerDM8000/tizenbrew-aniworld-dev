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
