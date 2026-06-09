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

  function readStartParam() {
    try {
      if (global.WebApp && global.WebApp.initDataUnsafe && global.WebApp.initDataUnsafe.start_param) {
        return String(global.WebApp.initDataUnsafe.start_param).trim();
      }
    } catch (e1) { /* ignore */ }
    try {
      var tg = global.Telegram && global.Telegram.WebApp;
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
        return String(tg.initDataUnsafe.start_param).trim();
      }
    } catch (e2) { /* ignore */ }
    return (
      readQueryParam("route") ||
      readQueryParam("startapp") ||
      ""
    ).trim();
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

  function waitForStartParam(maxMs, intervalMs) {
    maxMs = maxMs == null ? 2500 : maxMs;
    intervalMs = intervalMs == null ? 50 : intervalMs;
    return new Promise(function (resolve) {
      var elapsed = 0;
      function tick() {
        var value = readStartParam();
        if (value || elapsed >= maxMs) {
          resolve(value);
          return;
        }
        elapsed += intervalMs;
        setTimeout(tick, intervalMs);
      }
      tick();
    });
  }

  function showError(el, msg) {
    el.classList.remove("loading");
    el.className = "error";
    el.textContent = msg;
  }

  function renderMarkdown(el, text) {
    if (!global.marked || !global.DOMPurify) {
      showError(el, "Не удалось загрузить компоненты отображения.");
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

  function fetchText(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return res.text();
    });
  }

  function loadMarkdownInto(el, relativePath) {
    var url = absoluteAsset(relativePath) + "?_=" + Date.now();
    return fetchText(url).then(function (text) {
      renderMarkdown(el, text);
    });
  }

  function resolveRoute(route) {
    return ROUTE_DOCS[route] || "";
  }

  function resolveLegalDoc(docKind) {
    var kind = String(docKind || "terms").toLowerCase();
    return LEGAL_DOC_FILES[kind] || LEGAL_DOC_FILES.terms;
  }

  function bootRootApp(contentEl) {
    initBridge();
    waitForStartParam().then(function (route) {
      if (route === "gallery") {
        window.location.replace(absoluteAsset("miniapp/gallery/"));
        return;
      }
      var docPath = resolveRoute(route);
      if (!docPath) {
        docPath = LEGAL_DOC_FILES.terms;
      }
      loadMarkdownInto(contentEl, docPath).catch(function () {
        showError(
          contentEl,
          "Не удалось загрузить документ. Проверьте публикацию GitHub Pages."
        );
      });
    });
  }

  function bootLegalApp(contentEl, docKind) {
    initBridge();
    loadMarkdownInto(contentEl, resolveLegalDoc(docKind)).catch(function () {
      showError(
        contentEl,
        "Не удалось загрузить документ. Проверьте публикацию GitHub Pages."
      );
    });
  }

  function bootGuideApp(contentEl, relativePath) {
    initBridge();
    loadMarkdownInto(contentEl, relativePath).catch(function () {
      showError(contentEl, "Не удалось загрузить справку.");
    });
  }

  global.StyleGenieMiniApp = {
    siteRoot: siteRoot,
    absoluteAsset: absoluteAsset,
    initBridge: initBridge,
    readStartParam: readStartParam,
    waitForStartParam: waitForStartParam,
    bootRootApp: bootRootApp,
    bootLegalApp: bootLegalApp,
    bootGuideApp: bootGuideApp,
    resolveRoute: resolveRoute,
  };
})(window);
