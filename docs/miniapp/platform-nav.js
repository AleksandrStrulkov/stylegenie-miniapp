/** Навигация Mini App: «← Дашборд» только в MAX (в Telegram команды в меню бота). */
(function () {
  "use strict";

  function isTelegramMiniApp() {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      if (!tg) {
        return false;
      }
      if (tg.initData) {
        return true;
      }
      return !!(tg.platform && tg.platform !== "unknown");
    } catch (e) {
      return false;
    }
  }

  function isMaxMiniApp() {
    try {
      if (isTelegramMiniApp()) {
        return false;
      }
      return !!(window.WebApp && typeof window.WebApp.ready === "function");
    } catch (e) {
      return false;
    }
  }

  function applyMaxOnlyTopbars() {
    var bars = document.querySelectorAll(".topbar[data-max-only]");
    for (var i = 0; i < bars.length; i += 1) {
      var bar = bars[i];
      if (isMaxMiniApp()) {
        bar.hidden = false;
        bar.style.display = "";
      } else {
        bar.hidden = true;
        bar.style.display = "none";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyMaxOnlyTopbars);
  } else {
    applyMaxOnlyTopbars();
  }
})();
