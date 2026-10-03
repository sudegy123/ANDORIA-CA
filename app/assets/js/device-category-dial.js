/**
 * STEP 5 — CATEGORY PICKER AS A RADIAL DIAL
 * device-category-dial.js
 *
 * Turns the real #device-category-grid (the category cards
 * renderDeviceCategoryGrid() already renders, real photos included) into
 * a draggable Radial Dial carousel: cards sit on a hidden ellipse,
 * projected with depth-based scale/opacity/z-index so the frontmost card
 * reads as "nearest the viewer" — same 2D-transform trick as step-3's
 * orbit fan, just an ellipse instead of an arc, adapted from the
 * standalone prototype at Documents/product-browsers/4-radial-dial.html.
 *
 * Purely additive and re-entrant: renderDeviceCategoryGrid() rebuilds
 * #device-category-grid's innerHTML every time the customer returns to
 * the picker (language change, exitDeviceCategory(), re-entering step 5),
 * so this re-inits from scratch each time rather than assuming the DOM
 * nodes persist. The cards' own onclick="enterDeviceCategory(...)"
 * (already in the rendered markup) is never touched — tapping a card
 * navigates exactly as it did in the old 2-column grid, this file only
 * repositions the cards and stops a drag from being read as a tap.
 */
(function () {
  let rafId = null;
  let abortCtl = null; // cancels every listener a PREVIOUS init() attached

  function init() {
    const stage = document.getElementById('device-category-grid');
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll(':scope > .device-cat-card'));
    if (cards.length < 2) return; // 0-1 categories: plain flow is fine, nothing to spin

    // renderDeviceCategoryGrid() replaces #device-category-grid's
    // CHILDREN (innerHTML), not the stage element itself, and this runs
    // again every time the customer returns from a category — entering a
    // category then going back once already triggers a second init().
    // Without cleanup, every init() call adds ANOTHER full set of
    // pointerdown/move/up, wheel and click listeners onto the SAME
    // persistent stage node, each closing over its own now-stale `cards`
    // array from before the rebuild. The stale click listener still
    // fires (registration order), still calls stopImmediatePropagation()
    // unconditionally, and — since `cards.indexOf(card)` returns -1 for
    // any card from the NEW render — never resolves to "this is the
    // front card", so it silently blocks every later, correct listener
    // from ever running. Net effect: after entering any one category and
    // going back, tapping ANY category (even the genuinely front-facing
    // one) stopped working. Fixed by aborting every listener the
    // previous init() attached before this one attaches its own.
    if (abortCtl) abortCtl.abort();
    abortCtl = new AbortController();
    const { signal } = abortCtl;

    if (rafId) { cancelAnimationFrame(rafId); rafId = null; } // renderDeviceCategoryGrid() rebuilt the DOM — kill the previous loop
    stage.classList.remove('anim-fade-in', 'anim-stagger');
    cards.forEach(c => c.classList.remove('anim-fade-in'));

    const N = cards.length;
    const stepDeg = 360 / N;
    const panelName = document.getElementById('dial-cat-name');

    let W, H, cx, cy, RADIUS, cardSize;
    function layout() {
      const r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      cx = W * 0.5;
      // RADIUS must be computed FIRST from the stage's own W/H bounds
      // alone, then cardSize derived FROM it — not the other way around.
      // An earlier version derived cardSize from H and RADIUS from
      // min(W-bound, H-bound, cardSize-bound) independently: whichever
      // dimension (W or H) happened to be the tighter constraint could
      // cap RADIUS below what cardSize had already assumed (confirmed on
      // a real WebKit iPhone 13 profile: a 342px-WIDE stage bound RADIUS
      // to 130px while the 220px-TALL stage had independently sized the
      // card to 136px — the card ended up BIGGER than the radius meant to
      // separate it from its neighbors, collapsing the whole wheel into a
      // near-total pile). Deriving cardSize from the already-resolved
      // RADIUS instead guarantees the ratio holds no matter which
      // dimension is the bottleneck.
      // Was up to 0.34*W (120px cap) — side cards rode all the way out to
      // the stage's own edges, right under the fixed WhatsApp/Facebook
      // FABs (inset-inline-end:16px — the left edge in RTL), so the FAB
      // bubble sat directly on top of the side card instead of beside it.
      // Pull the ellipse in so side cards stay clear of that zone.
      // Keep the original radius/card size. Fit the ellipse's vertical
      // spread to the measured stage instead, so the scaled front card
      // and smaller rear cards stay clear of the stage clip.
      RADIUS = Math.max(85, Math.min(W * 0.38, H * 0.78, 150));
      // Card size was a FIXED 140px in CSS regardless of the stage's
      // actual measured geometry — fine on a tall/wide stage (844px-
      // viewport test profiles), but on a real short device a fixed size
      // could exceed RADIUS and leave no room for the ellipse to visually
      // separate the cards. Same fix property-fan.js already uses for its
      // own cards: size them in JS off the resolved geometry, not a
      // static CSS value.
      cardSize = Math.max(90, Math.min(150, RADIUS / 1.05));
      const rearHalfHeight = cardSize * 0.55 / 2;
      const frontHalfHeight = cardSize * 1.1 / 2;
      const stageInset = H * 0.04;
      const verticalSpread = Math.max(0, Math.min(0.42,
        (H - stageInset * 2 - rearHalfHeight - frontHalfHeight) / (2 * RADIUS)));
      cy = H * 0.5 + (rearHalfHeight - frontHalfHeight) * 0.5;
      stage.dataset.dialVerticalSpread = String(verticalSpread);
      cards.forEach(c => { c.style.width = cardSize + 'px'; c.style.height = cardSize + 'px'; });
      lastKey = null;
    }

    let angle = 0, targetAngle = 0, lastKey = null, shownSel = -1;
    function place() {
      const key = angle.toFixed(2) + '|' + W;
      if (key === lastKey) return;
      lastKey = key;
      let sel = 0, bestDepth = -Infinity;
      const info = cards.map((el, i) => {
        const a = (i * stepDeg + angle + 90) * Math.PI / 180;
        const depth = Math.sin(a);
        if (depth > bestDepth) { bestDepth = depth; sel = i; }
        return { el, a, depth };
      });
      info.forEach(({ el, a, depth }) => {
        const x = RADIUS * Math.cos(a);
        const y = RADIUS * Math.sin(a) * Number(stage.dataset.dialVerticalSpread || 0.42);
        const scale = 0.55 + (depth + 1) / 2 * 0.55;
        el.style.zIndex = String(Math.round(depth * 100) + 100);
        el.style.opacity = String(0.35 + (depth + 1) / 2 * 0.65);
        el.style.transform =
          'translate3d(' + (cx + x) + 'px,' + (cy + y) + 'px,0) translate(-50%,-50%) scale(' + scale + ')';
      });
      cards.forEach((el, i) => el.classList.toggle('dial-front', i === sel));
      if (sel !== shownSel) {
        shownSel = sel;
        if (panelName) {
          const nameEl = cards[sel].querySelector('.device-name');
          panelName.textContent = nameEl ? nameEl.textContent : '';
        }
      }
    }

    // Idle-aware loop: only animate while the dial is moving or being dragged.
    // (An always-on rAF loop kept low-end phones busy forever.)
    function kick() { if (!rafId) rafId = requestAnimationFrame(frame); }
    function frame() {
      rafId = null;
      if (!dragging) {
        angle += (targetAngle - angle) * 0.18;
        // Finish on the exact category angle. A residual fraction of a
        // degree can leave the dial's depth-based front-card selection on
        // the neighbor after a tap on a distant card.
        if (Math.abs(targetAngle - angle) < 0.05) angle = targetAngle;
      }
      place();
      if (dragging || angle !== targetAngle) kick();
    }

    // NOTE: this deliberately never trusts the card's own native click
    // event to arrive with the right target, or relies on pointerdown/up
    // pairing to even fire, for tap DECISIONS:
    // - Mouse: setPointerCapture() (needed so a drag that starts on a
    //   card keeps tracking once the pointer moves off it) retargets the
    //   compatibility click event's `target` to the CAPTURING element
    //   (the stage), not whatever was actually under the pointer.
    // - Touch: a real tap's click is NOT retargeted by pointer capture
    //   and fires straight at whatever was physically touched — but a
    //   plain tap also doesn't reliably run a full pointerdown→pointerup
    //   sequence through this code the way a mouse drag does (confirmed
    //   via a real iPhone-profile touch tap in testing, not assumed), so
    //   logic that only lived inside the old endDrag() never ran for it.
    // Fix: pointer events here ONLY drive continuous drag rotation. The
    // actual "is this the front card? enter it or spin it to front"
    // decision lives in the click handler below, which reliably fires
    // for every input type — it just has to tell a real drag-release
    // click (rotate a lot, don't select) from a real tap click (check
    // the front card) using the `moved` distance recorded during
    // whatever drag DID happen, defaulting to "was a tap" when none did.
    let dragging = false, lx = 0, moved = 0, downCard = null;
    stage.addEventListener('pointerdown', e => {
      dragging = true; kick(); lx = e.clientX; moved = 0;
      downCard = e.target.closest('.device-cat-card');
      stage.classList.add('dragging');
      stage.setPointerCapture(e.pointerId);
    }, { signal });
    stage.addEventListener('pointermove', e => {
      if (!dragging) return;
      let dx = e.clientX - lx; lx = e.clientX;
      moved += Math.abs(dx);
      // Firefox coalesces pointermove into fewer, chunkier events than
      // Chromium/WebKit for the same physical drag — the same real
      // gesture reports far bigger per-event dx there, which read as
      // wildly higher rotation "inertia" and could fling a card past the
      // stage's own bounds mid-drag. Clamp each event's contribution so
      // one coarse event can't out-rotate what a smooth one would.
      dx = Math.max(-24, Math.min(24, dx));
      // Was `angle += dx * 0.4` — opposite sign from the sibling orbit
      // fan (property-fan.js: `pos -= dx / pxPerCard`), so this dial spun
      // backwards relative to the drag direction the rest of the app
      // already established as correct.
      angle -= dx * 0.4;
      targetAngle = angle;
      kick();
    }, { signal });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('dragging');
      if (moved >= 6) {
        targetAngle = Math.round(angle / stepDeg) * stepDeg;
        downCard = null;
      }
      // moved < 6: leave `angle`/`targetAngle` alone — the click handler
      // below decides what a tap does, this only had rotation to settle.
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endDrag, { signal }));

    const wrapIdx = d => ((d + N / 2) % N + N) % N - N / 2;
    stage.addEventListener('click', e => {
      // Capture-phase + stopImmediatePropagation: this must run BEFORE,
      // and instead of, the card's own inline onclick="enterDeviceCategory
      // (...)" — otherwise that fires unconditionally right after this
      // handler returns, re-entering whatever was tapped regardless of
      // the front-card decision made below.
      e.preventDefault();
      e.stopImmediatePropagation();
      // A click firing at all means the interaction is over — but some
      // real touch taps fire pointerdown without a matching pointerup
      // (confirmed via a real iPhone-profile .tap() in testing), which
      // left `dragging` stuck true forever. frame()'s easing is gated on
      // `!dragging`, so targetAngle below got set correctly but nothing
      // ever animated toward it. Force-clear it here so a stuck state
      // from one gesture can never block the next.
      dragging = false;
      stage.classList.remove('dragging');
      const card = e.target.closest('.device-cat-card') || downCard;
      downCard = null;
      if (moved >= 6) return; // real drag-release click — already handled by endDrag(), not a tap
      if (!card) return;
      // Pointer capture retargets mouse clicks to the stage. `downCard`
      // preserves the card actually pressed. Background cards must first
      // rotate to the front; only the already-centered card may open.
      const idx = cards.indexOf(card);
      if (idx < 0) return;
      const contPos = -angle / stepDeg;
      const delta = Math.round(wrapIdx(idx - contPos));
      if (delta === 0) enterDeviceCategory(card.dataset.cat);
      else { targetAngle = angle - stepDeg * delta; kick(); }
    }, { capture: true, signal });

    // Was: one full stepDeg jump per wheel EVENT, using deltaY only. A
    // trackpad swipe fires dozens of events per gesture, so that spun
    // through many categories almost instantly ("very high inertia").
    // It also only read deltaY, so a horizontal trackpad swipe (which
    // reports through deltaX, deltaY≈0) always fell through to the same
    // `deltaY > 0 ? -1 : 1` branch regardless of swipe direction —
    // "always moves in only one direction". Fixed: treat wheel input as
    // continuous rotation (like a drag) using whichever axis has the
    // larger magnitude that event, and only snap to the nearest category
    // once the gesture has actually stopped (debounced), not per tick.
    let wheelIdleTimer = null;
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      angle -= d * 0.35;
      targetAngle = angle;
      kick();
      clearTimeout(wheelIdleTimer);
      wheelIdleTimer = setTimeout(() => {
        targetAngle = Math.round(angle / stepDeg) * stepDeg;
        kick();
      }, 140);
    }, { passive: false, signal });

    addEventListener('resize', () => { layout(); kick(); }, { signal }); // also leaked across re-inits without this
    layout();
    kick();
  }

  // Step 5's category view can (re)appear via real navigation,
  // language change, or exitDeviceCategory() — none of those are a fresh
  // page load, so re-check on a short delay after each in addition to
  // the initial load, same safety-net pattern as property-fan.js.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.initDeviceCategoryDial = init; // called by app.js right after renderDeviceCategoryGrid()
})();
