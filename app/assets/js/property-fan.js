/**
 * SOLAR SMART ADVISOR — PROPERTY TYPE ORBIT FAN
 * property-fan.js
 *
 * Turns the real #property-grid (step 3's 9 property-type cards) into
 * a draggable Orbit Fan carousel, reusing the exact Set 5 algorithm
 * (see memory: reference-orbit-fan-techniques). Operates on the SAME
 * real DOM nodes the app already renders (real onclick="selectProperty
 * (this)" wiring, real Cloudinary photo swap via
 * upgradePropertyCardImages()) — this file only repositions them, it
 * never re-implements selection. Tap-select calls the card's own
 * .click(), so the existing app logic fires unchanged.
 *
 * Purely additive: if #property-grid isn't a fan-mode step-3 grid
 * (e.g. #shop-type-grid), this script never touches it.
 */
(function () {
  function init() {
    const stage = document.getElementById('property-grid');
    if (!stage || stage.dataset.fanInit) return;

    // Step 3 starts hidden. A hidden stage can report a zero/small box, so
    // wait for it to become measurable before calculating card positions.
    const initialRect = stage.getBoundingClientRect();
    if (initialRect.width < 100 || initialRect.height < 100) {
      if (!stage.dataset.fanPending && 'ResizeObserver' in window) {
        stage.dataset.fanPending = '1';
        const observer = new ResizeObserver(entries => {
          const box = entries[0]?.contentRect;
          if (box && box.width >= 100 && box.height >= 100) {
            observer.disconnect();
            delete stage.dataset.fanPending;
            init();
          }
        });
        observer.observe(stage);
      }
      return;
    }
    stage.dataset.fanInit = '1';

    const cards = Array.from(stage.querySelectorAll(':scope > .property-card'));
    if (cards.length < 2) return;
    cards.forEach(c => c.classList.remove('anim-fade-in')); // avoid fighting the entrance keyframe with JS transforms
    stage.classList.remove('anim-stagger');

    const N = cards.length;

    // Inject the label/counter + prev/next controls right after the stage
    const panel = document.createElement('div');
    panel.className = 'fan-panel';
    panel.innerHTML = '<div class="fan-name" id="fan-name"></div><div class="fan-count" id="fan-count"></div>';
    stage.insertAdjacentElement('afterend', panel);

    const ctl = document.createElement('div');
    ctl.className = 'fan-ctl';
    ctl.innerHTML = '<button type="button" id="fan-prev" aria-label="السابق">→</button><button type="button" id="fan-next" aria-label="التالي">←</button>';
    panel.insertAdjacentElement('afterend', ctl);

    const fanName = panel.querySelector('#fan-name');
    const fanCount = panel.querySelector('#fan-count');

    let W, H, cw, ch, R, cx, cy, stepDeg, maxAng, pxPerCard;
    function layout() {
      const r = stage.getBoundingClientRect();
      if (r.width < 100 || r.height < 100) return;
      W = r.width; H = r.height;
      ch = Math.max(120, Math.min(220, H * 0.62));
      cw = ch * 0.78;
      // R was fixed relative to width only — fine for the tall standalone
      // demo's stage, but on the real app's much shorter fan stage
      // (clamp()'d to as little as ~220px) that produced a wheel radius
      // way bigger than the stage itself. Cap it relative to the stage's
      // own height too so the curve stays proportioned to the space it
      // actually has.
      R = Math.max(220, Math.min(W * 1.05, H * 1.8));
      cx = W * 0.5;
      // Center the wheel so the ACTIVE (top) card sits vertically centered
      // in the stage. Card top-left ends up at (cy - R - ch/2); setting
      // that equal to the desired centered offset (H-ch)/2 and solving
      // for cy gives cy = R + H/2 exactly (verified against the live
      // `transform` string's actual numbers, not just derived on paper —
      // an earlier version of this formula, R + (H-ch)/2, had an algebra
      // slip and left ~150px of dead space below the cards).
      cy = R + H * 0.5;
      stepDeg = (cw * 1.22 / R) * 180 / Math.PI;
      maxAng = Math.min(92, (N / 2) * stepDeg - 3);
      pxPerCard = R * stepDeg * Math.PI / 180;
      cards.forEach(c => { c.style.width = cw + 'px'; c.style.height = ch + 'px'; });
      lastKey = null;
    }
    const wrap = d => ((d + N / 2) % N + N) % N - N / 2;

    let pos = 0, target = 0, lastKey = null;
    function place() {
      const key = pos + '|' + W + '|' + H;
      if (key === lastKey) return;
      lastKey = key;
      const activeIdx = ((Math.round(pos) % N) + N) % N;
      cards.forEach((el, i) => {
        const d = wrap(i - pos), ang = d * stepDeg, a = Math.abs(ang), rad = ang * Math.PI / 180;
        let op = a >= maxAng ? 0 : Math.min(1, (maxAng - a) / 10);
        el.classList.toggle('fan-active', i === activeIdx);
        // Keep the transform current even while off-arc/hidden, so a card
        // never has a stale (e.g. default top-left) transform to visibly
        // jump/slide from the instant it rotates back into view.
        el.style.transform =
          'translate3d(' + cx + 'px,' + cy + 'px,0) rotate(' + ang + 'deg) ' +
          'translate3d(' + (-cw / 2) + 'px,' + (-R - ch / 2) + 'px,0) ' +
          'scale(' + (1 + 0.02 * Math.max(0, 1 - Math.abs(d))) + ')';
        if (op <= 0.01) { el.style.visibility = 'hidden'; return; }
        el.style.visibility = 'visible';
        el.style.opacity = op;
        el.style.zIndex = 100 - Math.round(Math.abs(d) * 10);
      });
    }
    function updatePanel() {
      const idx = ((Math.round(pos) % N) + N) % N;
      const nameEl = cards[idx].querySelector('.property-name');
      fanName.textContent = nameEl ? nameEl.textContent : '';
      fanCount.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    }

    let dragging = false, last = performance.now(), userActive = false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    function go(t) { target = Math.round(t); userActive = true; }
    function frame() {
      const now = performance.now(), dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      if (!dragging) {
        pos = reduce.matches ? target : pos + (target - pos) * (1 - Math.exp(-dt * 7.5));
        if (Math.abs(target - pos) < 0.003) pos = target;
      }
      place(); updatePanel();
      requestAnimationFrame(frame);
    }

    let lx = 0, lt = 0, vel = 0, moved = 0, downCard = null;
    stage.addEventListener('pointerdown', e => {
      dragging = true; userActive = true; lx = e.clientX; lt = performance.now(); vel = 0; moved = 0;
      downCard = e.target.closest('.property-card');
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('dragging');
    });
    stage.addEventListener('pointermove', e => {
      if (dragging && e.buttons === 0) return endDrag();
      if (!dragging) return;
      const dx = e.clientX - lx, now = performance.now();
      moved += Math.abs(dx); lx = e.clientX;
      pos -= dx / pxPerCard; target = pos;
      vel = 0.8 * vel + 0.2 * (-dx / pxPerCard / Math.max(0.001, (now - lt) / 1000)); lt = now;
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false; stage.classList.remove('dragging');
      if (moved < 6 && downCard) {
        const idx = Number(downCard.dataset.i);
        if (Math.round(wrap(idx - pos)) === 0) {
          downCard.click(); // already-active card tapped — fire real selection
        } else {
          go(Math.round(pos) + Math.round(wrap(idx - pos)));
        }
      } else {
        if (performance.now() - lt > 90) vel = 0;
        go(pos + Math.max(-4, Math.min(4, vel * 0.22)));
      }
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, endDrag));

    stage.addEventListener('wheel', e => {
      e.preventDefault();
      go(Math.round(target) + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1));
    }, { passive: false });

    document.getElementById('fan-next').onclick = () => go(Math.round(target) + 1);
    document.getElementById('fan-prev').onclick = () => go(Math.round(target) - 1);

    // Whichever card is already .selected (e.g. returning to this step) becomes the resting position
    cards.forEach((c, i) => { c.dataset.i = i; });
    const preselected = cards.findIndex(c => c.classList.contains('selected'));
    pos = target = preselected >= 0 ? preselected : 0;

    // When selectProperty() runs (real click, from a tap OR a synthetic click), make the wheel catch up.
    // Must go via the wrapped shortest-path delta, not the raw index — a
    // straight `go(idx)` targets that index literally, so e.g. pos=7,
    // idx=0 on N=9 cards interpolates pos 7->0 the LONG way (7 steps)
    // instead of the short way (2 steps via 7->8->0), which looked like
    // the wheel spinning almost a full 360 before landing on the tapped card.
    stage.addEventListener('click', e => {
      const card = e.target.closest('.property-card');
      if (!card) return;
      const idx = Number(card.dataset.i);
      go(Math.round(pos) + Math.round(wrap(idx - pos)));
    });

    addEventListener('resize', layout);
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(stage);
    layout();
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // step-3 is entered later via SPA navigation, not a fresh page load —
  // re-check shortly after in case #property-grid wasn't in the DOM yet
  // at DOMContentLoaded (it always is here, but this is a cheap safety net).
  setTimeout(init, 300);
})();
