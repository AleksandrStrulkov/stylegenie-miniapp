(function (global) {
  "use strict";

  function cfg() {
    return global.__SG_DASHBOARD__ || {};
  }

  function initBridge() {
    try {
      if (global.WebApp && typeof global.WebApp.ready === "function") {
        global.WebApp.ready();
      }
    } catch (e) { /* ignore */ }
  }

  function getInitData() {
    try {
      if (global.WebApp && global.WebApp.initData) {
        return String(global.WebApp.initData);
      }
    } catch (e1) { /* ignore */ }
    return "";
  }

  function miniappRoot() {
    var path = global.location.pathname || "";
    var idx = path.indexOf("/miniapp/");
    if (idx >= 0) {
      return path.slice(0, idx + "/miniapp/".length);
    }
    return "/miniapp/";
  }

  function navigate(relativePath) {
    var root = miniappRoot();
    var clean = String(relativePath || "").replace(/^\/+/, "");
    global.location.href = root + clean;
  }

  function apiBase() {
    var base = String(cfg().apiBaseUrl || "").replace(/\/+$/, "");
    if (!base) return "";
    if (base.indexOf("/api/miniapp") === base.length - "/api/miniapp".length) {
      return base;
    }
    if (base.indexOf("/api/miniapp/") >= 0) {
      return base.replace(/\/api\/miniapp\/.*$/, "/api/miniapp");
    }
    return base + "/api/miniapp";
  }

  function apiUrl(path) {
    var base = apiBase();
    if (!base) return "";
    var suffix = String(path || "").replace(/^\/+/, "");
    return base + "/" + suffix;
  }

  function fetchProfile() {
    var url = apiUrl("profile");
    var initData = getInitData();
    if (!url || !initData) {
      return Promise.resolve(null);
    }
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData }),
    }).then(function (response) {
      if (!response.ok) throw new Error("profile " + response.status);
      return response.json();
    });
  }

  function triggerStartGeneration() {
    var url = apiUrl("actions/start-generation");
    var initData = getInitData();
    if (!url || !initData) {
      return Promise.reject(new Error("api unavailable"));
    }
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData }),
    }).then(function (response) {
      if (!response.ok) throw new Error("action " + response.status);
      return response.json();
    });
  }

  function openBotChat() {
    var link = String(cfg().botLink || "https://max.ru/").trim();
    try {
      if (global.WebApp && typeof global.WebApp.openMaxLink === "function") {
        global.WebApp.openMaxLink(link);
        return;
      }
      if (global.WebApp && typeof global.WebApp.openLink === "function") {
        global.WebApp.openLink(link);
        return;
      }
    } catch (e) { /* ignore */ }
    global.location.href = link;
  }

  function closeMiniApp() {
    try {
      if (global.WebApp && typeof global.WebApp.close === "function") {
        global.WebApp.close();
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  global.StyleGenieBridge = {
    initBridge: initBridge,
    getInitData: getInitData,
    navigate: navigate,
    fetchProfile: fetchProfile,
    triggerStartGeneration: triggerStartGeneration,
    openBotChat: openBotChat,
    closeMiniApp: closeMiniApp,
    miniappRoot: miniappRoot,
  };
})(window);
