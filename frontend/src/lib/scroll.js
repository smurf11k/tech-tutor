export function scrollToHash(hash, behavior = "smooth") {
  const id = (hash || "").replace(/^#/, "");
  if (!id) {
    return;
  }

  window.requestAnimationFrame(() => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior, block: "start" });
    }
  });
}
