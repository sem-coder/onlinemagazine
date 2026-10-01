(function () {
  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : "";

  function fsStyle() {
    return "position:absolute;top:12px;right:12px;z-index:5;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.55);color:#f4f6f5;border-radius:999px;padding:6px 12px;font:12px/1.2 system-ui,sans-serif;cursor:pointer;";
  }

  function currentFs() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  function bindFullscreen(iframe, btn) {
    function sync() {
      btn.textContent = currentFs() === iframe ? "Sluiten" : "Volledig scherm";
    }
    function ready() {
      try {
        iframe.contentWindow.postMessage({ source: "pdfmagazine", type: "parent-fs-ready" }, "*");
      } catch (e) {
        /* ignore */
      }
    }
    btn.addEventListener("click", function () {
      if (currentFs() === iframe) {
        var exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
        return;
      }
      var req = iframe.requestFullscreen || iframe.webkitRequestFullscreen || iframe.webkitRequestFullScreen;
      if (req) req.call(iframe);
    });
    iframe.addEventListener("load", ready);
    ready();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
  }

  function addButton(iframe) {
    if (iframe.getAttribute("data-pdfm-enhanced")) return;
    var wrap = iframe.parentNode;
    if (!wrap) return;
    iframe.setAttribute("data-pdfm-enhanced", "1");
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "fullscreen");
    if (wrap.querySelector("[data-pdfm-fs]")) {
      bindFullscreen(iframe, wrap.querySelector("[data-pdfm-fs]"));
      return;
    }
    var pos = window.getComputedStyle(wrap).position;
    if (pos === "static") wrap.style.position = "relative";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-pdfm-fs", "1");
    btn.setAttribute("aria-label", "Volledig scherm");
    btn.textContent = "Volledig scherm";
    btn.style.cssText = fsStyle();
    wrap.appendChild(btn);
    bindFullscreen(iframe, btn);
  }

  function mount(target) {
    var id = target.getAttribute("data-id");
    if (!id || target.getAttribute("data-ready")) return;
    target.setAttribute("data-ready", "1");
    target.style.cssText =
      "position:relative;width:100%;height:0;padding-top:max(640px,62.5%);overflow:hidden;background:#1b1d1c;";
    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed/" + encodeURIComponent(id);
    iframe.title = target.getAttribute("data-title") || "Magazine";
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "fullscreen");
    iframe.setAttribute("webkitallowfullscreen", "true");
    iframe.setAttribute("mozallowfullscreen", "true");
    iframe.style.cssText =
      "position:absolute;top:0;left:0;width:100% !important;height:100% !important;max-height:none !important;border:0;background:#1b1d1c;";
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
    if (data.type === "resize" && data.height && iframe.parentNode) {
      iframe.parentNode.style.paddingTop = Math.max(640, Number(data.height)) + "px";
    }
  });
})();
