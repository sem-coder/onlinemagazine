(function () {
  var script = document.currentScript;
  var origin = script && script.src ? new URL(script.src).origin : "";

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
  }

  document.querySelectorAll("[data-pdfmagazine]").forEach(mount);

  function findIframe(event) {
    var nodes = document.querySelectorAll("iframe");
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].contentWindow === event.source) return nodes[i];
    }
    return null;
  }

  function toggleIframeFullscreen(iframe) {
    var current = document.fullscreenElement || document.webkitFullscreenElement;
    if (current === iframe) {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      return;
    }
    var req = iframe.requestFullscreen || iframe.webkitRequestFullscreen || iframe.webkitRequestFullScreen;
    if (req) req.call(iframe);
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "pdfmagazine") return;
    var iframe = findIframe(event);
    if (!iframe) return;
    if (data.type === "resize" && data.height && iframe.parentNode) {
      iframe.parentNode.style.paddingTop = Math.max(640, Number(data.height)) + "px";
    }
    if (data.type === "fullscreen" || data.type === "toggle-fullscreen") {
      toggleIframeFullscreen(iframe);
    }
  });
})();
