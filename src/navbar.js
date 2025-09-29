// ca-nav.js — Webflow-ready init wrapper
(function () {
  const DEFAULTS = {
    panel: ".ca-nav-tab-mobile", // the mobile panel container
    openBtn: "[data-menu-open]", // global or within a wrapper
    closeBtn: "[data-menu-close]", // inside panel
    branding: ".nav-branding",
    linksWrap: ".nav-links",
    linkItem: ".ca-nav-link",
    cta: ".login-tab-mobile",
    lockBody: true, // lock scroll when open
    mobileOnly: true, // bind only on <= 1024px
    breakpoint: "(max-width: 1024px)",
  };

  function lockScroll(on) {
    const v = on ? "hidden" : "";
    document.documentElement.style.overflow = v;
    document.body.style.overflow = v;
    document.body.style.touchAction = on ? "none" : "";
  }

  function exists(el) {
    return !!el && el.nodeType === 1;
  }

  function buildTimeline(gsap, refs, reducedMotion) {
    const { panel, branding, links, cta } = refs;
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "power3.out" },
    });

    // initial state
    gsap.set(panel, { autoAlpha: 0, xPercent: 6 });
    if (branding) gsap.set(branding, { autoAlpha: 0, y: 10 });
    if (links?.length) gsap.set(links, { autoAlpha: 0, y: 16 });
    if (cta)
      gsap.set(cta, { autoAlpha: 0, y: 20, scale: 0.96, filter: "blur(4px)" });

    if (reducedMotion) {
      tl.to(panel, { autoAlpha: 1, xPercent: 0, duration: 0.12 }).to(
        [branding, ...(links || []), cta].filter(Boolean),
        { autoAlpha: 1, duration: 0.12 },
        0
      );
    } else {
      tl.to(panel, { autoAlpha: 1, xPercent: 0, duration: 0.34 })
        .to(branding, { autoAlpha: 1, y: 0, duration: 0.22 }, "-=0.10")
        .to(
          links || [],
          { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.26 },
          "-=0.08"
        )
        .to(
          cta,
          { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.24 },
          "-=0.12"
        );
    }
    return tl;
  }

  function fallbackOpen(panel) {
    panel.style.display = "block";
    panel.style.opacity = "1";
    panel.style.transform = "none";
  }
  function fallbackClose(panel) {
    panel.style.display = "";
    panel.style.opacity = "";
    panel.style.transform = "";
  }

  // Expose a single init you can call from Webflow
  window.clearautoNavInit = function clearautoNavInit(userOpts = {}) {
    const OPTS = { ...DEFAULTS, ...userOpts };
    const mq = window.matchMedia(OPTS.breakpoint);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // guard: don’t init twice on same panel
    const panel = document.querySelector(OPTS.panel);
    if (!exists(panel) || panel.dataset.caNavInit === "1") return;

    const btnOpen = document.querySelector(OPTS.openBtn);
    const btnClose = panel.querySelector(OPTS.closeBtn);
    if (!exists(btnOpen) || !exists(btnClose)) return;

    const branding = panel.querySelector(OPTS.branding);
    const linksWrap = panel.querySelector(OPTS.linksWrap);
    const links = linksWrap
      ? Array.from(linksWrap.querySelectorAll(OPTS.linkItem))
      : [];
    const cta = panel.querySelector(OPTS.cta);

    let tl = null;
    let bound = false;
    const listeners = [];

    function on(el, type, fn, opts) {
      if (!el) return;
      el.addEventListener(type, fn, opts);
      listeners.push({ el, type, fn });
    }
    function offAll() {
      listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
      listeners.length = 0;
    }

    function openMenu() {
      if (tl && tl.isActive && tl.isActive()) return;
      if (OPTS.lockBody) lockScroll(true);
      if (tl) tl.play(0);
      else fallbackOpen(panel);
    }
    function closeMenu() {
      if (tl && tl.isActive && tl.isActive()) return;
      if (tl) {
        tl.reverse().eventCallback(
          "onReverseComplete",
          () => OPTS.lockBody && lockScroll(false)
        );
      } else {
        fallbackClose(panel);
        if (OPTS.lockBody) lockScroll(false);
      }
    }

    function bind() {
      if (bound) return;
      // Build GSAP timeline if gsap is present
      if (window.gsap) {
        tl = buildTimeline(
          window.gsap,
          { panel, branding, links, cta },
          reducedMotion
        );
      } else {
        console.warn(
          "[CA-NAV] GSAP not found — using instant open/close fallback."
        );
      }

      on(btnOpen, "click", openMenu);
      on(btnClose, "click", closeMenu);

      // close on link/cta click
      [...links, cta].forEach((el) => on(el, "click", closeMenu));

      // ESC to close
      on(document, "keydown", (e) => {
        if (e.key === "Escape") closeMenu();
      });

      panel.dataset.caNavInit = "1";
      bound = true;
      // expose a small control API
      window.CA_MENU = {
        open: openMenu,
        close: closeMenu,
        isOpen: () =>
          tl
            ? tl.progress() > 0 && !tl.reversed()
            : panel.style.display === "block",
      };
    }

    function unbind() {
      if (!bound) return;
      offAll();
      // unlock if somehow left locked
      if (OPTS.lockBody) lockScroll(false);
      // reset panel styles if needed
      if (!window.gsap) fallbackClose(panel);
      panel.removeAttribute("data-ca-nav-init");
      bound = false;
    }

    function handleMQ(e) {
      if (!OPTS.mobileOnly) {
        if (!bound) bind();
        return;
      }
      e.matches ? bind() : unbind(); // <=1024px bind, >1024px unbind
    }

    // initial
    if (OPTS.mobileOnly) handleMQ(mq);
    else bind();
    mq.addEventListener("change", handleMQ);
  };
})();
