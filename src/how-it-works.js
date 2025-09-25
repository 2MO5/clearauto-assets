// HOW IT WORKS — DESKTOP (vertical) + MOBILE (horizontal)
// Requires: GSAP 3 + ScrollTrigger. Keep your DOM classes as in your snippet.

gsap.registerPlugin(ScrollTrigger);

(function () {
  const SEL = {
    section: ".ca-about-product.how-it-works",
    steps: ".steps .step",
    mocks: ".right-panel .device-mockup",
    ticker: ".steps .ticker",
    tickerMobile: ".steps .ticker.mobile",
    track: ".steps .ticker.mobile .hiw-track",
    thumb: ".steps .ticker.mobile .ticker-thumb",
    stops: ".steps .ticker.mobile .hiw-stop",
  };

  // ---- Public init
  window.howItWorksInit = function howItWorksInit() {
    const section = document.querySelector(SEL.section);
    if (!section) return;

    // guard: no double init
    if (section.dataset.hiwInit === "1") return;
    section.dataset.hiwInit = "1";

    // respect prefers-reduced-motion
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // kill any prior triggers if hot-reloading
    ScrollTrigger.getAll().forEach((t) => {
      if (t.vars?.id && String(t.vars.id).startsWith("HIW")) t.kill();
    });

    // media routing
    ScrollTrigger.matchMedia({
      "(min-width: 992px)": () => {
        if (reduce) {
          simpleRevealDesktop();
          return;
        }
        howItWorksDesktop();
      },
      "(max-width: 991px)": () => {
        if (reduce) {
          simpleRevealMobile();
          return;
        }
        howItWorksMobile();
      },
    });

    // refresh after images load (mockups)
    const imgs = section.querySelectorAll("img");
    let left = imgs.length || 0;
    if (left)
      imgs.forEach((img) => {
        if (img.complete) {
          if (--left === 0) ScrollTrigger.refresh();
        } else
          img.addEventListener(
            "load",
            () => {
              if (--left === 0) ScrollTrigger.refresh();
            },
            { once: true }
          );
      });
  };

  // ---------- DESKTOP (vertical scroll, pinned column, ticker moves with step)
  function howItWorksDesktop() {
    const section = document.querySelector(SEL.section);
    const steps = gsap.utils.toArray(SEL.steps);
    const mocks = gsap.utils.toArray(SEL.mocks);
    const ticker = section.querySelector(SEL.ticker);

    if (steps.length < 2 || mocks.length < 2 || !ticker) return;

    // measure vertical offsets relative to the first step
    const measure = () => {
      const baseTop = steps[0].getBoundingClientRect().top + window.scrollY;
      return steps.map((s) => {
        const rTop = s.getBoundingClientRect().top + window.scrollY;
        return rTop - baseTop;
      });
    };

    let offsets = measure();
    ScrollTrigger.addEventListener("refreshInit", () => {
      offsets = measure();
    });

    // Set initial state
    gsap.set(steps, { opacity: 0 });
    gsap.set(mocks, { opacity: 0 });
    gsap.set(steps[0], { opacity: 1 });
    gsap.set(mocks[0], { opacity: 1 });

    const tl = gsap.timeline({
      defaults: { ease: "power2.out", duration: 0.3 },
      scrollTrigger: {
        id: "HIW-desktop",
        trigger: section,
        start: "42% top",
        end: "+=" + (steps.length - 1) * 100 + "%",
        scrub: true,
        pin: true,
        pinSpacing: true,
        // markers: true,   // turn on only when debugging
      },
    });

    // Build transitions per step
    steps.forEach((step, i) => {
      const nextStep = steps[i + 1];
      const nextMock = mocks[i + 1];
      if (!nextStep || !nextMock) return;

      tl.to(ticker, { y: () => offsets[i + 1] }, "+=0.1")
        .to(nextStep, { opacity: 1 }, "<")
        .to(step, { opacity: 0 }, "<")
        .to(nextMock, { opacity: 1 }, "<")
        .to(mocks[i], { opacity: 0 }, "<");
    });
  }

  // ---------- MOBILE (horizontal ticker with snap, pinned section)
  function howItWorksMobile() {
    const section = document.querySelector(SEL.section);
    const tickerMobile = section.querySelector(SEL.tickerMobile);
    const track = section.querySelector(SEL.track);
    const thumb = section.querySelector(SEL.thumb);
    const stops = gsap.utils.toArray(SEL.stops);
    const mocks = gsap.utils.toArray(SEL.mocks);
    const steps = gsap.utils.toArray(SEL.steps);

    if (!tickerMobile || !track || !thumb || stops.length < 2) return;

    // compute center x for each stop (relative to track)
    let stopX = [];
    const measure = () => {
      stopX.length = 0;
      const tr = track.getBoundingClientRect();
      stops.forEach((s) => {
        const r = s.getBoundingClientRect();
        stopX.push(r.left + r.width / 2 - tr.left);
      });
    };
    measure();
    ScrollTrigger.addEventListener("refreshInit", measure);

    // initial states
    gsap.set(thumb, { x: stopX[0] });
    gsap.set(steps, { opacity: 0, y: 8 });
    gsap.set(mocks, { opacity: 0, y: 8, scale: 0.98 });
    gsap.set(steps[0], { opacity: 1, y: 0 });
    gsap.set(mocks[0], { opacity: 1, y: 0, scale: 1 });

    const setActive = (idx) => {
      stops.forEach((s, i) =>
        gsap.to(s, { opacity: i === idx ? 1 : 0.5, duration: 0.2 })
      );
      mocks.forEach((m, i) =>
        gsap.to(m, {
          opacity: i === idx ? 1 : 0,
          y: i === idx ? 0 : 8,
          scale: i === idx ? 1 : 0.98,
          duration: 0.3,
          ease: "power2.out",
        })
      );
      steps.forEach((c, i) =>
        gsap.to(c, {
          opacity: i === idx ? 1 : 0,
          y: i === idx ? 0 : 8,
          duration: 0.25,
          ease: "power2.out",
        })
      );
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        id: "HIW-mobile",
        trigger: section,
        start: "top top",
        end: "+=" + (stops.length - 1) * 100 + "%",
        pin: true,
        scrub: true,
        pinSpacing: true,
        snap: {
          snapTo: (v) => {
            const idx = Math.round(v * (stops.length - 1));
            return idx / (stops.length - 1);
          },
          duration: 0.18,
          ease: "power1.out",
        },
        onUpdate: (st) => {
          const p = st.progress * (stops.length - 1);
          const i = Math.floor(p),
            f = p - i;
          const x = gsap.utils.interpolate(
            stopX[i],
            stopX[i + 1] ?? stopX[i],
            f
          );
          gsap.set(thumb, { x });
        },
        onSnapComplete: (st) => {
          const idx = Math.round(st.progress * (stops.length - 1));
          setActive(idx);
        },
        // markers: true,
      },
    });

    // ensure first state
    setActive(0);
  }

  // ---------- Simple reduced-motion fallbacks
  function simpleRevealDesktop() {
    const steps = gsap.utils.toArray(SEL.steps);
    const mocks = gsap.utils.toArray(SEL.mocks);
    gsap.set(steps, { opacity: 1, clearProps: "y" });
    gsap.set(mocks, { opacity: 1, clearProps: "y,scale" });
  }
  function simpleRevealMobile() {
    simpleRevealDesktop();
  }
})();
