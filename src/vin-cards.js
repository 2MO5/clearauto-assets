/* vin-cards.js — Clean Auto stacked cards (desktop/mobile tuned) */
(function (root, factory) {
  root.vinCardsInit = factory(root);
})(window, function (win) {
  "use strict";

  // --- tiny utils ---
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else fn();
  }
  function waitForGSAP(next) {
    if (win.gsap && win.ScrollTrigger) {
      win.gsap.registerPlugin(win.ScrollTrigger);
      return next();
    }
    const t = setInterval(() => {
      if (win.gsap && win.ScrollTrigger) {
        clearInterval(t);
        win.gsap.registerPlugin(win.ScrollTrigger);
        next();
      }
    }, 30);
    setTimeout(() => {
      clearInterval(t);
      console.warn("[vin] GSAP not found after 10s");
    }, 10000);
  }
  // ==== Shared registry for CTA defers ====
  const CTA_REG = { deferred: [] };

  // =========================
  //  VIN CARDS (main section)
  // =========================
  function vinCards() {
    // ---- selectors ----
    const SECTION = ".scroll-stack-section";
    const STAGE = ".card-stack-container";
    const CARD = ".card-benefit";
    const PIN_WRAPPER = ".ca-vin-input-section"; // fallback to SECTION if missing

    const section = document.querySelector(SECTION);
    const stage = document.querySelector(STAGE);
    const cards = gsap.utils.toArray(`${SECTION} ${CARD}`);

    //---retry--
    if (
      !section ||
      !stage ||
      cards.length === 0 ||
      stage.dataset.vinInit === "1"
    ) {
      // retry once shortly later in case CMS/IX2 just finished
      if (!stage || stage.dataset.vinRetry === "1") return;
      if (stage) stage.dataset.vinRetry = "1";
      setTimeout(() => {
        try {
          vinCards();
        } catch (e) {
          console.warn("[vin] retry failed", e);
        }
      }, 120);
      return;
    }

    // ---- guards ----
    if (
      !section ||
      !stage ||
      cards.length === 0 ||
      stage.dataset.vinInit === "1"
    )
      return;
    stage.dataset.vinInit = "1";

    // ---- env helpers ----
    const isDesktop = () => win.matchMedia("(min-width: 992px)").matches;
    const getSwipeThreshold = () => (isDesktop() ? 90 : 40);

    // ---- wrap control (desktop outside pin; off while pinned) ----
    let WRAP = isDesktop();
    function syncWrap(isActive) {
      WRAP = isActive ? false : isDesktop();
    }

    // ---- layout ----
    gsap.set(stage, {
      position: "relative",
      height: Math.min(win.innerHeight * 0.6, 640),
      overflow: "hidden",
    });
    gsap.set(cards, {
      position: "absolute",
      inset: 0,
      margin: "auto",
      transformOrigin: "50% 70%",
      willChange: "transform,opacity",
      zIndex: 0,
    });

    // ---- seed visible stack ----
    cards.forEach((c, i) => {
      if (i < 3) {
        gsap.set(c, {
          opacity: 1 - i * 0.15,
          scale: 1 - i * 0.05,
          y: i * 36,
          zIndex: cards.length - i,
        });
      } else {
        gsap.set(c, { opacity: 0, scale: 0.86, y: 108, zIndex: 0 });
      }
    });

    const steps = cards.length;

    // ---- tuning knobs ----
    const ANIM_DUR = 0.95;
    const EASE = "power3.out";
    const COOLDOWN_MS = 460;

    // ---- mark active ----
    function markActive(frontIdx) {
      cards.forEach((card, i) => {
        if (i === frontIdx) {
          card.classList.add("is-active");
          card.setAttribute("aria-hidden", "false");
          card.style.pointerEvents = "auto";
        } else {
          card.classList.remove("is-active");
          card.setAttribute("aria-hidden", "true");
          card.style.pointerEvents = "none";
        }
      });
    }

    // ---- state setter ----
    function setState(idx) {
      const front = idx % steps;
      const middle = (idx + 1) % steps;
      const back = (idx + 2) % steps;

      markActive(front);

      cards.forEach((card, i) => {
        const cfg =
          i === front
            ? { opacity: 1.0, scale: 1.0, y: 0, zIndex: 3 }
            : i === middle
            ? { opacity: 0.85, scale: 0.95, y: 36, zIndex: 2 }
            : i === back
            ? { opacity: 0.7, scale: 0.9, y: 72, zIndex: 1 }
            : { opacity: 0, scale: 0.86, y: 108, zIndex: 0 };

        if (i === front) card.classList.add("ring-sweep");
        else card.classList.remove("ring-sweep");

        gsap.to(card, { ...cfg, duration: ANIM_DUR, ease: EASE });
      });
    }
    setState(0);

    // ---- discrete TL (time === index) ----
    const tl = gsap.timeline({ paused: true });
    for (let i = 0; i < steps; i++) tl.add(() => setState(i), i);
    setState(0);

    // ---- helpers ----
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const norm = (i) =>
      WRAP ? ((i % steps) + steps) % steps : clamp(i, 0, steps - 1);

    // ---- stepper state ----
    let index = 0;
    let lastStepAt = 0;
    let locked = false;

    // ---- Scroll sync utils (mobile nudge to reduce dead swipes at end) ----
    const getSetScroll = ScrollTrigger.getScrollFunc(win);
    const perStepScrollMobile = () => {
      const tlLen = Math.max(steps - 1, 1);
      const stride = win.innerHeight * 0.9; // same stride as pin math for mobile
      const tail = win.innerHeight * 0.6;
      return Math.max(win.innerHeight, tlLen * stride + tail) / tlLen;
    };

    function go(to) {
      if (locked) return;
      const now = performance.now();
      if (now - lastStepAt < COOLDOWN_MS) return;

      locked = true;
      lastStepAt = now;
      const prev = index;
      index = norm(to);

      gsap.killTweensOf(tl);
      gsap.to(tl, {
        time: index,
        duration: ANIM_DUR,
        ease: EASE,
        onComplete: () => {
          locked = false;
        },
      });

      // advance pinned scroll on MOBILE so unpin happens with minimal extra swipes
      if (!isDesktop() && win.__vinPinST && win.__vinPinST.isActive) {
        const dir = index > prev ? 1 : index < prev ? -1 : 0;
        if (dir !== 0) {
          const per = perStepScrollMobile();
          const curr = getSetScroll(); // read
          getSetScroll(curr + dir * per); // write
        }
      }
    }

    // ---- CTA deferring ----
    function playDeferredCTAsOnce() {
      CTA_REG.deferred.forEach((entry) => {
        if (entry._armed) return;
        entry._armed = true;

        gsap.delayedCall(1.05, () => {
          if (!entry.ctaTL._played) {
            entry.ctaTL.play();
            entry.ctaTL._played = true;
          }
        });
      });
    }

    // ---- pinning ----
    const pinTarget = document.querySelector(PIN_WRAPPER)
      ? PIN_WRAPPER
      : SECTION;

    const SCROLL_PER_CARD = win.innerHeight * 1.2;
    const tail = win.innerHeight * 0.6;
    const timelineLength = steps - 1;

    let totalScroll;
    if (isDesktop()) {
      // Desktop: half distance → snappy, no double laps
      totalScroll = Math.max(
        win.innerHeight,
        (timelineLength * SCROLL_PER_CARD) / 2 + tail
      );
    } else {
      // Mobile: exact timeline length, shorter stride
      totalScroll = Math.max(
        win.innerHeight,
        timelineLength * (win.innerHeight * 0.9) + tail
      );
    }

    const pinST = ScrollTrigger.create({
      trigger: pinTarget,
      start: "30% top",
      end: () => "+=" + totalScroll,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      onEnter: () => {
        syncWrap(true);
        attachInput();
      },
      onEnterBack: () => {
        syncWrap(true);
        attachInput();
      },
      onLeave: () => {
        detachInput();
        syncWrap(false);
        playDeferredCTAsOnce();
      },
      onLeaveBack: () => {
        detachInput();
        syncWrap(false);
      },
    });

    // expose for downstream gating
    win.__vinPinST = pinST;

    // ---- input (wheel + touch + keys) with accumulator ----
    let touchStartY = null;
    let accY = 0;

    const atStart = () => !WRAP && index === 0;
    const atEnd = () => !WRAP && index === steps - 1;

    function handleAccumulated(dy) {
      accY += dy;
      if (Math.abs(accY) >= getSwipeThreshold()) {
        if (!locked) {
          go(accY > 0 ? index + 1 : index - 1);
          accY = 0;
        } else {
          accY = 0;
        }
      }
    }

    function wheelHandler(e) {
      const dy = e.deltaY;
      // let native scroll exit the pin at edges (only when not wrapping)
      if ((atEnd() && dy > 0) || (atStart() && dy < 0)) return;
      e.preventDefault();
      handleAccumulated(dy);
    }

    function attachInput() {
      win.addEventListener("wheel", wheelHandler, { passive: false });
      win.addEventListener("touchstart", onTouchStart, { passive: true });
      win.addEventListener("touchmove", onTouchMove, { passive: false });
      win.addEventListener("touchend", onTouchEnd, { passive: true });
      win.addEventListener("keydown", onKeys);
    }
    function detachInput() {
      win.removeEventListener("wheel", wheelHandler, { passive: false });
      win.removeEventListener("touchstart", onTouchStart, { passive: true });
      win.removeEventListener("touchmove", onTouchMove, { passive: false });
      win.removeEventListener("touchend", onTouchEnd, { passive: true });
      win.removeEventListener("keydown", onKeys);
      accY = 0;
      touchStartY = null;
    }

    function onTouchStart(e) {
      touchStartY = e.touches && e.touches.length ? e.touches[0].clientY : null;
    }
    function onTouchMove(e) {
      if (touchStartY == null) return;
      const currY = e.touches[0].clientY;
      const dy = touchStartY - currY; // >0 = down
      touchStartY = currY;
      if ((atEnd() && dy > 0) || (atStart() && dy < 0)) return; // let it bubble
      e.preventDefault();
      handleAccumulated(dy);
    }
    function onTouchEnd() {
      touchStartY = null;
      accY = 0;
    }
    function onKeys(e) {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        go(index + 1);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      }
    }

    // ---- resize ----
    function onResize() {
      gsap.set(stage, { height: Math.min(win.innerHeight * 0.6, 640) });

      const vh = win.innerHeight;
      const dStride = vh * 1.2;
      const mStride = vh * 0.9;
      const runway = vh * 0.6;

      let newTotal;
      if (isDesktop()) {
        newTotal = Math.max(vh, (timelineLength * dStride) / 2 + runway);
      } else {
        newTotal = Math.max(vh, timelineLength * mStride + runway);
      }

      pinST.vars.end = "+=" + newTotal; // ALWAYS update
      pinST.refresh();
      syncWrap(pinST.isActive); // keep WRAP in sync after refresh
    }
    win.addEventListener("resize", onResize);
  } // end vinCards

  // =======================================
  //  Intro reveal for section (non-pin elems)
  // =======================================
  function sectionIntroReveal_NoWrapper() {
    const SECTION_SEL = ".scroll-stack-section";
    const PIN_SEL = ".ca-vin-input-section";
    const STAGE_SEL = ".card-stack-container";
    const CTA_SEL = ".ca-cta-block";

    const section = document.querySelector(SECTION_SEL);
    if (!section || section.dataset.secIntroInit === "1") return;
    section.dataset.secIntroInit = "1";

    const pinWrapper = section.querySelector(PIN_SEL);
    const stage = section.querySelector(STAGE_SEL);

    const introParts = Array.from(section.children).filter(
      (el) => el !== pinWrapper && el !== stage && !el.matches(CTA_SEL)
    );

    [...introParts, stage].forEach((el) => {
      if (!el) return;
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
    });

    const vintl = gsap.timeline({
      paused: true,
      defaults: { duration: 0.7, ease: "power3.out", overwrite: "auto" },
    });

    if (introParts.length) {
      vintl.from(
        introParts,
        {
          y: 24,
          opacity: 0,
          stagger: { each: 0.07, from: "start" },
          force3D: true,
        },
        0
      );
    }

    if (stage) {
      vintl.from(
        stage,
        {
          y: 16,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          force3D: true,
        },
        0.1
      );
    }

    ScrollTrigger.create({
      trigger: section,
      start: "top 85%",
      end: "top 65%",
      once: true,
      onEnter: () =>
        vintl.play().then(() => {
          gsap.set(introParts, { clearProps: "transform,opacity,will-change" });
          if (stage)
            gsap.set(stage, { clearProps: "transform,opacity,will-change" });
        }),
    });
  }

  // =================
  //  CTA stagger all
  // =================
  function ctaStaggerAll() {
    const BLOCKS = document.querySelectorAll(".ca-cta-block");
    if (
      !BLOCKS.length ||
      win.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    BLOCKS.forEach(($block) => {
      if ($block.dataset.ctaInit === "1") return;
      $block.dataset.ctaInit = "1";

      const HEADING = ".ca-heading-cta";
      const BUTTON = ".ca-button--primary-2.cta-style";
      const USERS = ".ca-cta-socialstrip .users";
      const STAT = ".ca-cta-socialstrip h1, .ca-cta-socialstrip .stat";

      const ctx = gsap.context((self) => {
        const q = self.selector;

        const h = q(HEADING)[0];
        let wordSpans = [];
        if (h && !h.querySelector(".w")) {
          const words = h.textContent.trim().split(/\s+/);
          h.innerHTML = words
            .map((w) => `<span class="w">${w}&nbsp;</span>`)
            .join("");
          wordSpans = h.querySelectorAll(".w");
        } else if (h) {
          wordSpans = h.querySelectorAll(".w");
        }

        gsap.set(wordSpans.length ? wordSpans : q(HEADING), {
          opacity: 0,
          y: 24,
          filter: "blur(6px)",
        });
        gsap.set(q(BUTTON), {
          opacity: 0,
          y: 18,
          scale: 0.98,
          filter: "blur(6px)",
        });

        const avImgs = q(`${USERS} img`);
        if (avImgs.length) {
          gsap.set(avImgs, {
            opacity: 0,
            y: 16,
            x: -8,
            rotate: -6,
            transformOrigin: "50% 50%",
          });
        } else {
          gsap.set(q(USERS), { opacity: 0, y: 16 });
        }
        gsap.set(q(STAT), { opacity: 0, y: 12 });

        const isDeferred = $block.hasAttribute("data-cta-defer");
        const startAt = $block.dataset.ctaStart || "top 75%";
        const endAt = $block.dataset.ctaEnd || null;
        const isCenter = $block.classList.contains("ca-cta-center");

        const defaults = { ease: "power3.out" };
        const stCfg = endAt
          ? {
              trigger: $block,
              start: startAt,
              end: endAt,
              once: true,
              invalidateOnRefresh: true,
            }
          : {
              trigger: $block,
              start: startAt,
              once: true,
              invalidateOnRefresh: true,
            };

        const BTN_SEL =
          ".ca-button--primary-2.cta.style, .ca-button--primary-2.cta-style, .ca-button--primary";
        const ctaTL = gsap.timeline(
          isDeferred
            ? { paused: true, defaults }
            : { defaults, scrollTrigger: stCfg }
        );

        ctaTL
          .to(wordSpans.length ? wordSpans : q(HEADING), {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.7,
            stagger: wordSpans.length ? { each: 0.06, from: "start" } : 0,
          })
          .fromTo(
            q(BUTTON),
            { autoAlpha: 0, y: 18, scale: 0.98, filter: "blur(6px)" },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.55,
              overwrite: "auto",
            },
            "-=0.2"
          )
          .to(
            avImgs.length ? avImgs : q(USERS),
            {
              opacity: 1,
              y: 0,
              x: 0,
              rotate: 0,
              duration: 0.5,
              stagger: avImgs.length
                ? { each: 0.07, from: isCenter ? "center" : "start" }
                : 0,
            },
            "-=0.15"
          )
          .to(q(STAT), { opacity: 1, y: 0, duration: 0.4 }, "-=0.25");

        const btn = q(BUTTON)[0];
        if (btn) {
          const breath = gsap.to(btn, {
            scale: 1.008,
            duration: 1.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
          btn.addEventListener("mouseenter", () => breath.pause());
          btn.addEventListener("mouseleave", () => breath.resume());
          ctaTL.add(() => breath.play());
        }
        if (avImgs.length) {
          gsap.to(avImgs, {
            y: "+=4",
            duration: 2.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: { each: 0.2, from: "random" },
          });
        }

        if (isDeferred)
          CTA_REG.deferred.push({ ctaTL, block: $block, _armed: false });
      }, $block);
    });
  }

  // =========
  //  EXPORTS
  // =========
  function init() {
    onReady(() => {
      waitForGSAP(() => {
        vinCards();
        sectionIntroReveal_NoWrapper();
        ctaStaggerAll();
      });
    });
  }

  // optional aliases (safe to keep)
  win.clearautoVinCardsInit = init;

  return init;
});
