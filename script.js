// Theme toggle: follows the OS until the visitor picks one, then remembers it.
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");

  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));

  toggle.addEventListener("click", function () {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
})();

document.getElementById("year").textContent = new Date().getFullYear();

// Fade sections in as they scroll into view.
(function () {
  const items = document.querySelectorAll(".section, .feature-card, .project-card");
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  items.forEach(function (el) {
    el.classList.add("reveal");
    observer.observe(el);
  });
})();
