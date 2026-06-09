(function (global) {
  "use strict";

  var ROUTE_ALIASES = {
    terms: "legal:terms",
    privacy: "legal:privacy",
    consent: "legal:consent",
  };

  var activeLoadId = 0;

  function routes() {
    return global.__SG_ROUTES__ || {};
  }

  function normalizeRoute(raw) {
    var route = String(raw || "").trim();
    if (!route) return "";
    return ROUTE_ALIASES[route] || route;
  }

  function readQueryParam(name) {
    try {
      var search = new URLSearchParams(global.location.search);
      if (search.get(name)) return search.get(name);
      var hash = (global.location.hash || "").replace(/^#/, "");
      if (hash) {
        var hp = new URLSearchParams(hash);
        if (hp.get(name)) return hp.get(name);
      }
    } catch (e) { /* ignore */ }
    return "";
  }

  function readStartParamFromUrl() {
    return (
      readQueryParam("startapp") ||
      readQueryParam("start_param") ||
      readQueryParam("route") ||
      readQueryParam("tgWebAppStartParam") ||
      readQueryParam("WebAppStartParam") ||
      ""
    ).trim();
  }

  function parseStartParamFromInitData(raw) {
    if (!raw) return "";
    try {
      return new URLSearchParams(String(raw)).get("start_param") || "";
    } catch (e1) {
      return "";
    }
  }

  function getInitDataRaw() {
    try {
      if (global.WebApp && global.WebApp.initData) {
        return String(global.WebApp.initData);
      }
      var tg = global.Telegram && global.Telegram.WebApp;
      if (tg && tg.initData) return String(tg.initData);
    } catch (e) { /* ignore */ }
    return "";
  }

  function readStartParam() {
    var value = readStartParamFromUrl();
    if (value) return normalizeRoute(value);
    try {
      if (global.WebApp && global.WebApp.initDataUnsafe && global.WebApp.initDataUnsafe.start_param) {
        value = String(global.WebApp.initDataUnsafe.start_param).trim();
      }
    } catch (e1) { /* ignore */ }
    if (!value) {
      value = parseStartParamFromInitData(getInitDataRaw()).trim();
    }
    if (!value) {
      try {
        var tg = global.Telegram && global.Telegram.WebApp;
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
          value = String(tg.initDataUnsafe.start_param).trim();
        } else if (tg && tg.initData) {
          value = parseStartParamFromInitData(tg.initData).trim();
        }
      } catch (e2) { /* ignore */ }
    }
    return normalizeRoute(value);
  }

  function initBridge() {
    try {
      if (global.WebApp && typeof global.WebApp.ready === "function") {
        global.WebApp.ready();
      }
    } catch (e1) { /* ignore */ }
    try {
      var tg = global.Telegram && global.Telegram.WebApp;
      if (tg) {
        tg.ready();
        if (typeof tg.expand === "function") tg.expand();
        if (typeof tg.setHeaderColor === "function") {
          tg.setHeaderColor("secondary_bg_color");
        }
      }
    } catch (e2) { /* ignore */ }
  }

  function showLoading(el, text) {
    el.className = "loading";
    el.textContent = text || "Загрузка…";
  }

  function showError(el, msg, loadId) {
    if (loadId != null && loadId !== activeLoadId) return;
    el.className = "error";
    el.textContent = msg;
  }

  function renderRoute(el, route, loadId) {
    if (loadId != null && loadId !== activeLoadId) return;
    if (route === "gallery") {
      var root = global.location.pathname.replace(/\/[^/]*$/, "/");
      if (root.indexOf("/miniapp/") >= 0) {
        root = root.slice(0, root.indexOf("/miniapp/") + 1);
      }
      global.location.replace(root + "miniapp/gallery/");
      return;
    }
    var data = routes()[route];
    if (!data || !data.html) {
      showError(el, "Раздел не найден.", loadId);
      return;
    }
    el.className = "doc-md";
    el.innerHTML = data.html;
    if (data.title) {
      global.document.title = data.title;
    }
  }

  function loadRoute(el, route) {
    var loadId = ++activeLoadId;
    showLoading(el, "Загрузка…");
    renderRoute(el, route, loadId);
  }

  function initDataHasStartParam() {
    var raw = getInitDataRaw();
    if (!raw) return false;
    try {
      return new URLSearchParams(raw).has("start_param");
    } catch (e1) {
      return false;
    }
  }

  function isInitDataReady() {
    try {
      if (global.WebApp) {
        if (global.WebApp.initData) return true;
        if (global.WebApp.initDataUnsafe && global.WebApp.initDataUnsafe.auth_date) {
          return true;
        }
      }
      var tg = global.Telegram && global.Telegram.WebApp;
      if (tg) {
        if (tg.initData) return true;
        if (tg.initDataUnsafe && tg.initDataUnsafe.auth_date) return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  /**
   * MAX: start_param может прийти с задержкой — опрос до 12 с, без ранней оферты.
   * Главная кнопка Mini App: initData готов, start_param в initData отсутствует → оферта.
   */
  function bootRootApp(contentEl) {
    initBridge();
    if (!routes() || !Object.keys(routes()).length) {
      showError(contentEl, "Bundle не загружен. Пересоберите Mini App.");
      return;
    }

    var interval = 50;
    var maxWait = 12000;
    var elapsed = 0;
    var appliedRoute = null;

    function applyRoute(route) {
      route = normalizeRoute(route);
      if (!route || route === appliedRoute) return;
      appliedRoute = route;
      loadRoute(contentEl, route);
    }

    function tick() {
      var route = readStartParam();
      if (route) {
        applyRoute(route);
      } else if (
        isInitDataReady() &&
        !initDataHasStartParam() &&
        elapsed >= 1500 &&
        !appliedRoute
      ) {
        applyRoute("legal:terms");
      }

      elapsed += interval;
      if (elapsed < maxWait) {
        global.setTimeout(tick, interval);
        return;
      }
      if (!appliedRoute) {
        applyRoute("legal:terms");
      }
    }

    showLoading(contentEl, "Загрузка…");
    tick();
  }

  function bootDirectRoute(contentEl, route) {
    initBridge();
    loadRoute(contentEl, normalizeRoute(route));
  }

  function bootLegalDoc(contentEl, docKind) {
    bootDirectRoute(contentEl, "legal:" + String(docKind || "terms").toLowerCase());
  }

  global.StyleGenieMiniApp = {
    bootRootApp: bootRootApp,
    bootDirectRoute: bootDirectRoute,
    bootLegalApp: bootLegalDoc,
    bootGuideApp: function (el, _path) {
      var route = _path.indexOf("models") >= 0 ? "models" : "quality";
      bootDirectRoute(el, route);
    },
    readStartParam: readStartParam,
    initBridge: initBridge,
  };
})(window);
