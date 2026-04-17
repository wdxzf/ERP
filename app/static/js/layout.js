const SIDEBAR_KEY = "sidebarCollapsed";
const MOBILE_BREAKPOINT = 900;

function getSidebar() {
  return document.querySelector(".sidebar");
}

function isMobileView() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function renderIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function applySidebarState(collapsed) {
  const sidebar = getSidebar();
  if (!sidebar) return;

  const nextCollapsed = !isMobileView() && collapsed;
  sidebar.classList.toggle("collapsed", nextCollapsed);
  const toggle = document.getElementById("sidebar-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(!nextCollapsed));
    toggle.setAttribute("aria-label", nextCollapsed ? "展开侧栏" : "折叠侧栏");
  }
}

function readSidebarState() {
  return window.localStorage.getItem(SIDEBAR_KEY) === "true";
}

function writeSidebarState(collapsed) {
  window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
}

function initSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = getSidebar();
  if (!toggle || !sidebar) return;

  renderIcons();
  applySidebarState(readSidebarState());

  toggle.addEventListener("click", () => {
    if (isMobileView()) return;
    const next = !sidebar.classList.contains("collapsed");
    applySidebarState(next);
    writeSidebarState(next);
  });

  sidebar.addEventListener("click", (event) => {
    const summary = event.target.closest(".sidebar-group-summary");
    if (summary && sidebar.classList.contains("collapsed")) {
      event.preventDefault();
    }
  });

  window.addEventListener("resize", () => {
    applySidebarState(readSidebarState());
  });
}

initSidebarToggle();
