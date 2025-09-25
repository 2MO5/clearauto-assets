// ClearAuto report tabs (mobile + tablet ≤ 1024px)
// File: reports-mobile-tab.js
(function () {
  const SEL = {
    root: ".ca-about-product.report.mobile",
    pillWrap: ".report-pills",
    pills: ".report-pills .pill",
    mockups: ".report-mockup .mockup-img",
    copies: ".report-copies .report-copy",
  };

  function clearautoReportInit() {
    const root = document.querySelector(SEL.root);
    if (!root || root.dataset.reportInit === "1") return;

    const mq = window.matchMedia("(max-width: 1024px)");
    let bound = false;
    let pillWrap, pills, mockups, copies;
    const listeners = [];

    function on(el, type, fn, opts) {
      el.addEventListener(type, fn, opts);
      listeners.push({ el, type, fn });
    }
    function offAll() {
      listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
      listeners.length = 0;
    }
    function isHorizScrollable(el) {
      return !!el && el.scrollWidth > el.clientWidth + 1;
    }

    function setActive(idx, focusTab = false) {
      const n = pills.length;
      const active = Math.max(0, Math.min(idx, n - 1));

      pills.forEach((tab, i) => {
        const onTab = i === active;
        tab.classList.toggle("is-active", onTab);
        tab.setAttribute("aria-selected", onTab ? "true" : "false");
        tab.setAttribute("tabindex", onTab ? "0" : "-1");
        if (onTab && focusTab) tab.focus({ preventScroll: true });
      });

      mockups.forEach((panel, i) => {
        const on = i === active;
        panel.classList.toggle("is-active", on);
        panel.toggleAttribute("hidden", !on);
        panel.setAttribute("aria-hidden", on ? "false" : "true");
      });
      copies.forEach((panel, i) => {
        const on = i === active;
        panel.classList.toggle("is-active", on);
        panel.toggleAttribute("hidden", !on);
        panel.setAttribute("aria-hidden", on ? "false" : "true");
      });

      const activeTab = pills[active];
      if (isHorizScrollable(pillWrap)) {
        activeTab.scrollIntoView({
          inline: "center",
          block: "nearest",
          behavior: "smooth",
        });
      }
    }

    function move(delta) {
      const i = pills.findIndex((p) => p.classList.contains("is-active"));
      const next = (i + delta + pills.length) % pills.length;
      setActive(next, true);
    }

    function bind() {
      if (bound) return;

      pillWrap = root.querySelector(SEL.pillWrap);
      pills = Array.from(root.querySelectorAll(SEL.pills));
      mockups = Array.from(root.querySelectorAll(SEL.mockups));
      copies = Array.from(root.querySelectorAll(SEL.copies));

      if (
        !pillWrap ||
        pills.length !== 3 ||
        mockups.length !== 3 ||
        copies.length !== 3
      )
        return;

      pillWrap.setAttribute("role", "tablist");
      pills.forEach((tab, i) => {
        if (!tab.id) tab.id = `report-tab-${i + 1}`;
        const copy = copies[i];
        if (copy && !copy.id) copy.id = `report-panel-${i + 1}`;

        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", copy ? copy.id : "");
        tab.setAttribute("aria-selected", "false");
        tab.setAttribute("tabindex", "-1");

        if (copy) {
          copy.setAttribute("role", "tabpanel");
          copy.setAttribute("aria-labelledby", tab.id);
          copy.setAttribute("aria-hidden", "true");
          copy.setAttribute("hidden", "");
        }
        const mock = mockups[i];
        if (mock) {
          mock.setAttribute("role", "tabpanel");
          mock.setAttribute("aria-labelledby", tab.id);
          mock.setAttribute("aria-hidden", "true");
          mock.setAttribute("hidden", "");
        }

        on(tab, "click", () => setActive(i, false));
        on(tab, "keydown", (e) => {
          switch (e.key) {
            case "Enter":
            case " ":
              e.preventDefault();
              setActive(i, false);
              break;
            case "ArrowRight":
            case "ArrowDown":
              e.preventDefault();
              move(+1);
              break;
            case "ArrowLeft":
            case "ArrowUp":
              e.preventDefault();
              move(-1);
              break;
            case "Home":
              e.preventDefault();
              setActive(0, true);
              break;
            case "End":
              e.preventDefault();
              setActive(pills.length - 1, true);
              break;
          }
        });
      });

      const preset = pills.findIndex((p) => p.classList.contains("is-active"));
      setActive(preset >= 0 ? preset : 0, false);

      bound = true;
      root.dataset.reportInit = "1";
    }

    function unbind() {
      if (!bound) return;
      offAll();
      root.removeAttribute("data-report-init");
      bound = false;
    }
    function handleMQ(e) {
      e.matches ? bind() : unbind();
    }

    handleMQ(mq);
    mq.addEventListener("change", handleMQ);
  }

  // expose global init for Webflow
  window.clearautoReportInit = clearautoReportInit;
})();
