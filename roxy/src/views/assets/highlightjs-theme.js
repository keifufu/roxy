const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = `/assets/highlightjs-${window.theme}.css`;
document.head.appendChild(link);
