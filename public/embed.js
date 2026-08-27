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
    iframe.style.cssText =
      "position:absolute;top:0;left:0;width:100% !important;height:100% !important;max-height:none !important;border:0;background:#1b1d1c;";
    target.appendChild(iframe);
  }

  document.querySelectorAll("[data-pdfmagazine]").forEach(mount);

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "pdfmagazine" || data.type !== "resize") return;
    document.querySelectorAll("[data-pdfmagazine] iframe").forEach(function (iframe) {
      if (iframe.contentWindow === event.source && data.height) {
        iframe.parentNode.style.paddingTop = Math.max(640, Number(data.height)) + "px";
      }
    });
  });
})();
