(function (global) {
  "use strict";

  var ROUTE_DOCS = {
    "legal:terms": "documents/public_offer.md",
    "legal:privacy": "documents/policy_personal.md",
    "legal:consent": "documents/consent_personal.md",
    models: "documents/models_guide.md",
    quality: "documents/quality_guide.md",
  };

  var LEGAL_DOC_FILES = {
    terms: "documents/public_offer.md",
    privacy: "documents/policy_personal.md",
    consent: "documents/consent_personal.md",
  };

  // Короткие справки — встроены, без fetch (мгновенно в MAX WebView).
  var EMBEDDED_DOCS = {
    "documents/models_guide.md":
      "# Модели генерации образов\n\n" +
      "Краткие пояснения по семействам моделей StyleGenie AI.\n\n" +
      "## nano banana (1 💎)\n\n" +
      "Базовая модель для быстрых и экономичных образов. Подходит для повседневных селфи и простых стилей, когда важна скорость и минимальная стоимость.\n\n" +
      "## nano banana 2 (2–4 💎)\n\n" +
      "Улучшенная версия с более детальной проработкой лица и одежды. После выбора модели нужно указать **качество** (1K / 2K / 4K) — от него зависит разрешение и стоимость генерации.\n\n" +
      "## nano banana pro (3–6 💎)\n\n" +
      "Продвинутая модель для максимального качества и сложных образов. Также требует выбора качества (1K / 2K / 4K). Рекомендуется, если нужен наиболее реалистичный результат.\n",
    "documents/quality_guide.md":
      "# Качество генерации (1K / 2K / 4K)\n\n" +
      "Качество задаёт **разрешение выходного изображения** и влияет на стоимость в 💎.\n\n" +
      "## 1K\n\n" +
      "Минимальное разрешение. Быстрее и дешевле. Подходит для превью, сторис и случаев, когда не нужна максимальная детализация.\n\n" +
      "## 2K\n\n" +
      "Сбалансированный вариант: заметно выше детализация, чем у 1K, при умеренной стоимости. Хороший выбор для большинства публикаций.\n\n" +
      "## 4K\n\n" +
      "Максимальная детализация и размер файла. Рекомендуется для печати, крупных экранов и когда важна каждая деталь образа.\n",
  };

  var activeLoadId = 0;

  function siteRoot() {
    var path = window.location.pathname || "/";
    var miniIdx = path.indexOf("/miniapp/");
    if (miniIdx >= 0) {
      return path.slice(0, miniIdx + 1);
    }
    if (path.endsWith("/index.html")) {
      return path.slice(0, path.lastIndexOf("/") + 1);
    }
    return path.endsWith("/") ? path : path + "/";
  }

  function absoluteAsset(path) {
    return siteRoot() + String(path || "").replace(/^\//, "");
  }

  function readQueryParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function parseStartParamFromInitData(raw) {
    if (!raw) return "";
    try {
      return new URLSearchParams(String(raw)).get("start_param") || "";
    } catch (e1) {
      return "";
    }
  }

  function readStartParam() {
    var value = "";
    try {
      if (global.WebApp && global.WebApp.initDataUnsafe && global.WebApp.initDataUnsafe.start_param) {
        value = String(global.WebApp.initDataUnsafe.start_param).trim();
      }
    } catch (e1) { /* ignore */ }
    if (!value) {
      try {
        if (global.WebApp && global.WebApp.initData) {
          value = parseStartParamFromInitData(global.WebApp.initData).trim();
        }
      } catch (e2) { /* ignore */ }
    }
    if (!value) {
      try {
        var tg = global.Telegram && global.Telegram.WebApp;
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
          value = String(tg.initDataUnsafe.start_param).trim();
        } else if (tg && tg.initData) {
          value = parseStartParamFromInitData(tg.initData).trim();
        }
      } catch (e3) { /* ignore */ }
    }
    if (!value) {
      value = (
        readQueryParam("route") ||
        readQueryParam("startapp") ||
        readQueryParam("start_param") ||
        readQueryParam("tgWebAppStartParam") ||
        ""
      ).trim();
    }
    return value;
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

  function ensureLibrariesReady(maxMs) {
    maxMs = maxMs == null ? 8000 : maxMs;
    return new Promise(function (resolve, reject) {
      var elapsed = 0;
      function tick() {
        if (global.marked && global.DOMPurify) {
          resolve();
          return;
        }
        elapsed += 50;
        if (elapsed >= maxMs) {
          reject(new Error("libs timeout"));
          return;
        }
        setTimeout(tick, 50);
      }
      tick();
    });
  }

  function showLoading(el, text) {
    el.classList.remove("error");
    el.className = "loading";
    el.textContent = text || "Загрузка…";
  }

  function showError(el, msg, loadId) {
    if (loadId != null && loadId !== activeLoadId) return;
    el.classList.remove("loading");
    el.className = "error";
    el.textContent = msg;
  }

  function renderMarkdown(el, text, loadId) {
    if (loadId != null && loadId !== activeLoadId) return;
    if (!global.marked || !global.DOMPurify) {
      showError(el, "Не удалось загрузить компоненты отображения.", loadId);
      return;
    }
    global.marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: false,
      mangle: false,
    });
    el.classList.remove("loading", "error");
    el.className = "doc-md";
    var raw = global.marked.parse(String(text || ""));
    el.innerHTML = global.DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
    var h1 = el.querySelector("h1");
    if (h1) {
      document.title = h1.textContent.trim();
    }
  }

  function fetchText(url, retries) {
    retries = retries == null ? 2 : retries;
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return res.text();
    }).catch(function (err) {
      if (retries <= 0) throw err;
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          fetchText(url, retries - 1).then(resolve, reject);
        }, 400);
      });
    });
  }

  function loadMarkdownInto(el, relativePath, loadId) {
    var embedded = EMBEDDED_DOCS[relativePath];
    if (embedded) {
      renderMarkdown(el, embedded, loadId);
      return Promise.resolve();
    }
    var url = absoluteAsset(relativePath) + "?_=" + Date.now();
    return fetchText(url).then(function (text) {
      renderMarkdown(el, text, loadId);
    });
  }

  function resolveRoute(route) {
    return ROUTE_DOCS[route] || "";
  }

  function resolveLegalDoc(docKind) {
    var kind = String(docKind || "terms").toLowerCase();
    return LEGAL_DOC_FILES[kind] || LEGAL_DOC_FILES.terms;
  }

  function docPathForRoute(route) {
    if (route === "gallery" || route === "dashboard") return null;
    return resolveRoute(route) || LEGAL_DOC_FILES.terms;
  }

  function loadRoute(el, route) {
    if (route === "gallery") {
      window.location.replace(absoluteAsset("miniapp/gallery/"));
      return Promise.resolve();
    }
    if (route === "dashboard") {
      window.location.replace(absoluteAsset("miniapp/dashboard/"));
      return Promise.resolve();
    }
    var docPath = docPathForRoute(route);
    if (!docPath) return Promise.resolve();
    var loadId = ++activeLoadId;
    showLoading(el, "Загрузка…");
    return loadMarkdownInto(el, docPath, loadId).catch(function () {
      showError(
        el,
        "Не удалось загрузить документ. Проверьте соединение и попробуйте снова.",
        loadId
      );
    });
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

  function initDataHasStartParam() {
    var raw = getInitDataRaw();
    if (!raw) return false;
    try {
      return new URLSearchParams(raw).has("start_param");
    } catch (e1) {
      return false;
    }
  }

  /**
   * MAX иногда отдаёт initData/start_param с задержкой.
   * Пока initData не готов — только «Загрузка…» (без ложной ошибки и без оферты).
   * initData без start_param — главная кнопка Mini App → дашборд.
   */
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

  function watchRouteAndLoad(el, opts) {
    opts = opts || {};
    var interval = opts.interval || 80;
    var maxWait = opts.maxWait || 8000;
    var elapsed = 0;
    var appliedRoute = null;
    var stopped = false;

    function applyRoute(route) {
      if (!route || route === appliedRoute) return;
      appliedRoute = route;
      stopped = true;
      loadRoute(el, route);
    }

    function tick() {
      if (stopped) return;
      var route = readStartParam();
      if (route) {
        applyRoute(route);
        return;
      }
      if (isInitDataReady() && !initDataHasStartParam()) {
        applyRoute("dashboard");
        return;
      }
      elapsed += interval;
      if (elapsed >= maxWait) {
        applyRoute("dashboard");
        return;
      }
      setTimeout(tick, interval);
    }

    tick();
  }

  function bootRootApp(contentEl) {
    initBridge();
    ensureLibrariesReady().then(function () {
      watchRouteAndLoad(contentEl);
    }).catch(function () {
      showError(contentEl, "Не удалось загрузить компоненты отображения.");
    });
  }

  function bootLegalApp(contentEl, docKind) {
    initBridge();
    ensureLibrariesReady().then(function () {
      var loadId = ++activeLoadId;
      showLoading(contentEl, "Загрузка…");
      return loadMarkdownInto(contentEl, resolveLegalDoc(docKind), loadId);
    }).catch(function () {
      showError(contentEl, "Не удалось загрузить документ.");
    });
  }

  function bootGuideApp(contentEl, relativePath) {
    initBridge();
    ensureLibrariesReady().then(function () {
      var loadId = ++activeLoadId;
      showLoading(contentEl, "Загрузка…");
      return loadMarkdownInto(contentEl, relativePath, loadId);
    }).catch(function () {
      showError(contentEl, "Не удалось загрузить справку.");
    });
  }

  global.StyleGenieMiniApp = {
    siteRoot: siteRoot,
    absoluteAsset: absoluteAsset,
    initBridge: initBridge,
    readStartParam: readStartParam,
    bootRootApp: bootRootApp,
    bootLegalApp: bootLegalApp,
    bootGuideApp: bootGuideApp,
    resolveRoute: resolveRoute,
  };
})(window);
