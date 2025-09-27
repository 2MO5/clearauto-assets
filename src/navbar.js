// ca-nav.js
(function () {
  if (!window.gsap) {
    console.warn("GSAP required");
    return;
  }

  const panel = document.querySelector(".ca-nav-tab-mobile");
  const branding = panel?.querySelector(".nav-branding");
  const linksWrap = panel?.querySelector(".nav-links");
  const links = linksWrap
    ? Array.from(linksWrap.querySelectorAll(".ca-nav-link"))
    : [];
  const cta = panel?.querySelector(".login-tab-mobile");
  const btnOpen = document.querySelector("[data-menu-open]");
  const btnClose = panel?.querySelector("[data-menu-close]");

  if (!panel || !btnOpen || !btnClose) return;

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lockScroll = (on) => {
    const v = on ? "hidden" : "";
    document.documentElement.style.overflow = v;
    document.body.style.overflow = v;
    document.body.style.touchAction = on ? "none" : "";
  };

  gsap.set(panel, { autoAlpha: 0, xPercent: 6 });
  gsap.set(branding, { autoAlpha: 0, y: 10 });
  gsap.set(links, { autoAlpha: 0, y: 16 });
  gsap.set(cta, { autoAlpha: 0, y: 20, scale: 0.96, filter: "blur(4px)" });

  const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

  if (RM) {
    tl.to(panel, { autoAlpha: 1, xPercent: 0, duration: 0.12 }).to(
      [branding, ...links, cta],
      { autoAlpha: 1, duration: 0.12 },
      0
    );
  } else {
    tl.to(panel, { autoAlpha: 1, xPercent: 0, duration: 0.34 })
      .to(branding, { autoAlpha: 1, y: 0, duration: 0.22 }, "-=0.10")
      .to(
        links,
        { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.26 },
        "-=0.08"
      )
      .to(
        cta,
        { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.24 },
        "-=0.12"
      );
  }

  const openMenu = () => {
    if (!tl.isActive()) {
      lockScroll(true);
      tl.play(0);
    }
  };
  const closeMenu = () => {
    if (!tl.isActive()) {
      tl.reverse().eventCallback("onReverseComplete", () => lockScroll(false));
    }
  };

  btnOpen.addEventListener("click", openMenu);
  btnClose.addEventListener("click", closeMenu);

  [...links, cta].forEach(
    (el) => el && el.addEventListener("click", closeMenu)
  );

  window.CA_MENU = {
    open: openMenu,
    close: closeMenu,
    isOpen: () => tl.progress() > 0 && !tl.reversed(),
  };
})();
