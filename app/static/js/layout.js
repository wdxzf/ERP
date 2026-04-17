const SIDEBAR_KEY = "sidebarCollapsed";
const MOBILE_BREAKPOINT = 900;
const MOBILE_OPEN_CLASS = "mobile-nav-open";

function getSidebar() {
  return document.getElementById("app-sidebar") || document.querySelector(".sidebar");
}

function getDesktopToggle() {
  return document.getElementById("sidebar-toggle");
}

function getMobileToggle() {
  return document.getElementById("mobile-nav-toggle");
}

function getBackdrop() {
  return document.getElementById("sidebar-backdrop");
}

function isMobileView() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function renderIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function readSidebarState() {
  return window.localStorage.getItem(SIDEBAR_KEY) === "true";
}

function writeSidebarState(collapsed) {
  window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
}

function applyDesktopSidebarState(collapsed) {
  const sidebar = getSidebar();
  const desktopToggle = getDesktopToggle();
  if (!sidebar) return;

  const nextCollapsed = !isMobileView() && collapsed;
  sidebar.classList.toggle("collapsed", nextCollapsed);

  if (desktopToggle) {
    desktopToggle.setAttribute("aria-expanded", String(!nextCollapsed));
    desktopToggle.setAttribute("aria-label", nextCollapsed ? "展开侧栏" : "折叠侧栏");
  }
}

function setMobileNavOpen(open) {
  const nextOpen = Boolean(open) && isMobileView();
  const body = document.body;
  const sidebar = getSidebar();
  const mobileToggle = getMobileToggle();
  const backdrop = getBackdrop();

  body.classList.toggle(MOBILE_OPEN_CLASS, nextOpen);
  if (sidebar) sidebar.classList.toggle("mobile-open", nextOpen);
  if (backdrop) backdrop.classList.toggle("visible", nextOpen);

  if (mobileToggle) {
    mobileToggle.setAttribute("aria-expanded", String(nextOpen));
    mobileToggle.setAttribute("aria-label", nextOpen ? "关闭导航菜单" : "打开导航菜单");
  }
}

function syncSidebarLayout() {
  applyDesktopSidebarState(readSidebarState());
  if (!isMobileView()) {
    setMobileNavOpen(false);
  }
}

function initSidebarToggle() {
  const sidebar = getSidebar();
  const desktopToggle = getDesktopToggle();
  const mobileToggle = getMobileToggle();
  const backdrop = getBackdrop();

  if (!sidebar) return;

  renderIcons();
  syncSidebarLayout();

  if (desktopToggle) {
    desktopToggle.addEventListener("click", () => {
      if (isMobileView()) return;
      const nextCollapsed = !sidebar.classList.contains("collapsed");
      applyDesktopSidebarState(nextCollapsed);
      writeSidebarState(nextCollapsed);
    });
  }

  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      const nextOpen = !document.body.classList.contains(MOBILE_OPEN_CLASS);
      setMobileNavOpen(nextOpen);
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      setMobileNavOpen(false);
    });
  }

  sidebar.addEventListener("click", (event) => {
    const summary = event.target.closest(".sidebar-group-summary");
    if (summary && sidebar.classList.contains("collapsed") && !isMobileView()) {
      event.preventDefault();
      return;
    }

    const navLink = event.target.closest("a");
    if (navLink && isMobileView()) {
      setMobileNavOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMobileNavOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    syncSidebarLayout();
  });
}

initSidebarToggle();
