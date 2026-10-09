(function () {
  if (window.__pdfmEmbed) return;
  window.__pdfmEmbed = 1;

  var WRAP =
    "position:relative;width:100%;height:0;padding-top:max(640px,62.5%);overflow:hidden;background:#1b1d1c;";
  var WRAP_FS =
    "position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;padding:0;margin:0;z-index:2147483646;overflow:hidden;background:#1b1d1c;";
  var FRAME =
    "position:absolute;top:0;left:0;width:100% !important;height:100% !important;max-height:none !important;border:0;background:#1b1d1c;";
  var BTN =
    "position:absolute;top:12px;right:12px;z-index:2147483647;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.55);color:#f4f6f5;border-radius:999px;padding:6px 12px;font:12px/1.2 system-ui,sans-serif;cursor:pointer;";

  function nativeFs() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function wrapOf(iframe) {
    return iframe.parentNode;
  }

  function isFake(wrap) {
    return wrap && wrap.getAttribute("data-pdfm-x") === "1";
  }

  function isOn(iframe) {
    var wrap = wrapOf(iframe);
    return nativeFs() === iframe || isFake(wrap);
  }

  function applyFake(iframe, on) {
    var wrap = wrapOf(iframe);
    if (!wrap) return;
    var btn = wrap.querySelector("[data-pdfm-fs]");
    if (on) {
      wrap.setAttribute("data-pdfm-x", "1");
      wrap.style.cssText = WRAP_FS;
      iframe.style.cssText = FRAME;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      wrap.removeAttribute("data-pdfm-x");
      wrap.style.cssText = WRAP;
      iframe.style.cssText = FRAME;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    if (btn) btn.textContent = on ? "Sluiten" : "Volledig scherm";
    ping(iframe, on);
  }

  function ping(iframe, on) {
    try {
      iframe.contentWindow.postMessage(
        { source: "pdfmagazine", type: on ? "parent-fs-on" : "parent-fs-off" },
        "*",
      );
    } catch (e) {
      /* ignore */
    }
  }

  function ready(iframe) {
    try {
      iframe.contentWindow.postMessage({ source: "pdfmagazine", type: "parent-fs-ready" }, "*");
    } catch (e) {
      /* ignore */
    }
  }

  function exitNative() {
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit && nativeFs()) exit.call(document);
  }

  function enterNative(iframe) {
    var req = iframe.requestFullscreen || iframe.webkitRequestFullscreen || iframe.webkitRequestFullScreen;
    if (!req) {
      applyFake(iframe, true);
      return;
    }
    var result = req.call(iframe);
    if (result && typeof result.then === "function") {
      result.catch(function () {
        applyFake(iframe, true);
      });
    }
    window.setTimeout(function () {
      if (!isOn(iframe)) applyFake(iframe, true);
    }, 400);
  }

  function toggle(iframe, fromClick) {
    if (isOn(iframe)) {
      exitNative();
      applyFake(iframe, false);
      return;
    }
    if (fromClick) enterNative(iframe);
    else applyFake(iframe, true);
  }

  function syncBtn(iframe) {
    var wrap = wrapOf(iframe);
    var btn = wrap && wrap.querySelector("[data-pdfm-fs]");
    if (btn) btn.textContent = isOn(iframe) ? "Sluiten" : "Volledig scherm";
  }

  function bind(iframe, btn) {
    if (iframe.getAttribute("data-pdfm-bound") === "1") return;
    iframe.setAttribute("data-pdfm-bound", "1");
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "fullscreen *");
    iframe.setAttribute("webkitallowfullscreen", "true");
    iframe.setAttribute("mozallowfullscreen", "true");

    if (btn && !btn.getAttribute("data-pdfm-btn") && !btn.getAttribute("onclick")) {
      btn.setAttribute("data-pdfm-btn", "1");
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggle(iframe, true);
      });
    }

    iframe.addEventListener("load", function () {
      ready(iframe);
    });
    ready(iframe);

    document.addEventListener("fullscreenchange", function () {
      syncBtn(iframe);
      ping(iframe, isOn(iframe));
    });
    document.addEventListener("webkitfullscreenchange", function () {
      syncBtn(iframe);
      ping(iframe, isOn(iframe));
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isFake(wrapOf(iframe))) applyFake(iframe, false);
    });
  }

  function addButton(iframe) {
    if (iframe.getAttribute("data-pdfm-enhanced")) return;
    var wrap = iframe.parentNode;
    if (!wrap) return;
    iframe.setAttribute("data-pdfm-enhanced", "1");
    var existing = wrap.querySelector("[data-pdfm-fs]");
    if (existing) {
      bind(iframe, existing);
      return;
    }
    var pos = window.getComputedStyle(wrap).position;
    if (pos === "static") wrap.style.position = "relative";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-pdfm-fs", "1");
    btn.setAttribute("aria-label", "Volledig scherm");
    btn.textContent = "Volledig scherm";
    btn.style.cssText = BTN;
    wrap.appendChild(btn);
    bind(iframe, btn);
  }

  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : "";

  function mount(target) {
    var id = target.getAttribute("data-id");
    if (!id || target.getAttribute("data-ready")) return;
    target.setAttribute("data-ready", "1");
    target.style.cssText = WRAP;
    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed/" + encodeURIComponent(id);
    iframe.title = target.getAttribute("data-title") || "Magazine";
    iframe.style.cssText = FRAME;
    target.appendChild(iframe);
    addButton(iframe);
  }

  document.querySelectorAll("[data-pdfmagazine]").forEach(mount);
  document.querySelectorAll("iframe").forEach(function (iframe) {
    if (/\/embed\//.test(iframe.src || "")) addButton(iframe);
  });

  function findIframe(event) {
    var nodes = document.querySelectorAll("iframe");
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].contentWindow === event.source) return nodes[i];
    }
    return null;
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "pdfmagazine") return;
    var iframe = findIframe(event);
    if (!iframe) return;
    if (data.type === "resize" && data.height && iframe.parentNode && !isFake(iframe.parentNode) && nativeFs() !== iframe) {
      iframe.parentNode.style.paddingTop = Math.max(640, Number(data.height)) + "px";
    }
    if (data.type === "toggle-fullscreen") toggle(iframe, false);
    if (data.type === "request-parent-fs") ready(iframe);
  });
})();
