/**
 * SOLAR SMART ADVISOR — ROUTER
 * router.js
 *
 * Manages step navigation, transitions, and progress bar.
 * Pure navigation logic — no business logic here.
 */

'use strict';

const Router = (() => {

  const TOTAL_STEPS = 11; // Steps 2-12 (step 1 = welcome)

  // ── Navigation ─────────────────────────────────────────────────

  /**
   * Navigate to a step.
   * @param {number} toStep - target step number (1-10)
   * @param {number} fromStep - current step number
   * @param {Function} onEnter - callback after transition (receives step number)
   */
  function goTo(toStep, fromStep, onEnter) {
    if (toStep === fromStep) return;

    const fromEl = document.getElementById('step-' + fromStep);
    const toEl   = document.getElementById('step-' + toStep);

    if (!fromEl || !toEl) {
      console.warn('[Router] Step element not found:', fromStep, toStep);
      return;
    }

    const forward = toStep > fromStep;

    // Exit current step
    fromEl.classList.remove('active');
    fromEl.classList.add(forward ? 'exit-left' : 'exit-right');

    // Clean up exit class after transition
    const cleanup = () => {
      fromEl.classList.remove('exit-left', 'exit-right');
      fromEl.removeEventListener('transitionend', cleanup);
    };
    fromEl.addEventListener('transitionend', cleanup, { once: true });

    // Enter new step
    // Set initial position (opposite direction)
    toEl.style.transform = forward ? 'translateX(48px)' : 'translateX(-48px)';
    toEl.style.opacity   = '0';

    // Force reflow to ensure starting position is applied
    toEl.offsetHeight; // eslint-disable-line no-unused-expressions

    toEl.classList.add('active');
    toEl.style.transform = '';
    toEl.style.opacity   = '';

    // Update progress
    updateProgress(toStep);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Callback
    if (typeof onEnter === 'function') {
      // Small delay to allow DOM to paint before heavy rendering
      setTimeout(() => onEnter(toStep), 60);
    }
  }

  /**
   * Update the progress bar UI.
   * @param {number} currentStep
   */
  function updateProgress(currentStep) {
    const bar   = document.getElementById('progress-bar');
    const fill  = document.getElementById('prog-fill');
    const label = document.getElementById('prog-label');

    if (!bar) return;

    if (currentStep <= 1) {
      bar.classList.remove('visible');
      return;
    }

    bar.classList.add('visible');

    // Steps 2-10 = progress steps 1-9
    const progressStep = currentStep - 1;
    const pct = Math.round((progressStep / TOTAL_STEPS) * 100);

    if (fill)  fill.style.width = pct + '%';
    if (label) label.textContent = progressStep + ' / ' + TOTAL_STEPS;
  }

  // ── Public API ─────────────────────────────────────────────────
  return { goTo, updateProgress };

})();

if (typeof window !== 'undefined') window.Router = Router;
if (typeof module !== 'undefined') module.exports = Router;
