/* ============================================================
   DragKit — shared Pointer Events drag engine for every drag
   interaction on the platform (match / sequence / classify /
   diagram-label practice).

   Engine rules (house standard):
   - literal real-time dragging: fixed-position lift, translate3d
     applied synchronously on every pointermove, zero transition/
     animation on the dragged element while dragging
   - document-level move/up/cancel listeners (never rely on element
     listeners + capture alone), pointer capture as a belt-and-braces
   - rAF-coalesced hit-testing via elementsFromPoint
   - whole-tile drop targets (zoneUnder resolves via closest())
   - page-wide text-selection lock (body.dragging-active)
   - persistent-rAF edge auto-scroll for the whole drag
   - keyboard pick-and-place fallback on every chip
   ============================================================ */
(function () {
  'use strict';

  const autoScroll = {
    vel: 0, raf: null,
    start() {
      if (this.raf) return;
      const loop = () => {
        if (this.vel) window.scrollBy({ top: this.vel, behavior: 'instant' });
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    },
    update(y) {
      const m = 90;
      this.vel = y < m ? -Math.ceil((m - y) / 5)
        : y > window.innerHeight - m ? Math.ceil((y - (window.innerHeight - m)) / 5) : 0;
    },
    stop() { this.vel = 0; if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; },
  };

  document.addEventListener('selectstart', (e) => {
    if (document.body.classList.contains('dragging-active')) e.preventDefault();
  });

  /*
   * makeDraggable(chip, opts)
   *   opts.canDrag()            -> bool (default true)
   *   opts.zoneUnder(x, y, chip)-> drop-zone element or null (whole-tile aware)
   *   opts.hoverTarget(zone)    -> element to receive .drop-hover (default zone)
   *   opts.onDrop(chip, zone)   -> zone is null when released over nothing
   *   opts.onTap(chip)          -> tap (no movement) handler, optional
   *   opts.kbZones()            -> array of zones for keyboard placement
   *   opts.announce(msg)        -> aria-live announcer
   *   opts.chipName(chip)       -> accessible name for announcements
   */
  function makeDraggable(chip, opts) {
    chip.style.touchAction = 'none';
    const ptr = { id: null, sx: 0, sy: 0, moved: false, lastX: 0, lastY: 0 };
    let raf = null;
    let hovered = null;

    function clearHover() {
      if (hovered) { hovered.classList.remove('drop-hover'); hovered = null; }
    }
    function teardown() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      autoScroll.stop();
      clearHover();
      document.body.classList.remove('dragging-active');
    }
    function unstyle() {
      chip.classList.remove('dragging');
      chip.style.position = ''; chip.style.left = ''; chip.style.top = '';
      chip.style.width = ''; chip.style.margin = ''; chip.style.zIndex = '';
      chip.style.transform = '';
    }
    function hitTest() {
      raf = null;
      autoScroll.update(ptr.lastY);
      clearHover();
      const z = opts.zoneUnder(ptr.lastX, ptr.lastY, chip);
      if (z) {
        hovered = (opts.hoverTarget ? opts.hoverTarget(z) : z);
        if (hovered) hovered.classList.add('drop-hover');
      }
    }
    function onMove(e) {
      if (ptr.id !== e.pointerId) return;
      if (!ptr.moved) {
        if (Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) < 6) return;
        ptr.moved = true;
        const r = chip.getBoundingClientRect();
        chip.style.position = 'fixed';
        chip.style.left = r.left + 'px'; chip.style.top = r.top + 'px';
        chip.style.width = r.width + 'px'; chip.style.margin = '0'; chip.style.zIndex = '1000';
        chip.classList.add('dragging');
        document.body.classList.add('dragging-active');
        try { chip.setPointerCapture(e.pointerId); } catch (_) {}
        autoScroll.start();
        ptr.sx = e.clientX; ptr.sy = e.clientY;
        ptr.lastX = e.clientX; ptr.lastY = e.clientY;
        return;
      }
      ptr.lastX = e.clientX; ptr.lastY = e.clientY;
      chip.style.transform =
        'translate3d(' + (e.clientX - ptr.sx) + 'px,' + (e.clientY - ptr.sy) + 'px,0) scale(1.03)';
      if (raf == null) raf = requestAnimationFrame(hitTest);
    }
    function onUp(e) {
      if (ptr.id !== e.pointerId) return;
      ptr.id = null;
      teardown();
      if (!ptr.moved) {
        unstyle();
        if (opts.onTap) opts.onTap(chip);
        return;
      }
      ptr.moved = false;
      const z = (e.type === 'pointercancel') ? null : opts.zoneUnder(e.clientX, e.clientY, chip);
      unstyle();
      opts.onDrop(chip, z || null);
      chip.classList.add('snap-in');
      setTimeout(() => chip.classList.remove('snap-in'), 360);
    }
    chip.addEventListener('pointerdown', (e) => {
      if (ptr.id !== null) return;
      if (opts.canDrag && !opts.canDrag(chip)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptr.id = e.pointerId; ptr.moved = false; ptr.sx = e.clientX; ptr.sy = e.clientY;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
    chip.addEventListener('lostpointercapture', (e) => {
      if (ptr.id !== e.pointerId) return;
      const wasMoved = ptr.moved;
      ptr.id = null; ptr.moved = false;
      teardown();
      if (wasMoved) { unstyle(); opts.onDrop(chip, null); }
    });

    // Keyboard pick-and-place: Enter/Space lifts the chip, arrow/tab moves focus
    // between zones, Enter/Space on a zone drops it there, Escape cancels.
    chip.setAttribute('tabindex', '0');
    chip.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (opts.canDrag && !opts.canDrag(chip)) return;
      const kit = chip._dragKitKb || (chip._dragKitKb = {});
      const zones = (opts.kbZones ? opts.kbZones() : []);
      if (!zones.length) return;
      const name = opts.chipName ? opts.chipName(chip) : 'item';
      if (kit.picked) { endKb(); if (opts.announce) opts.announce(name + ' put down.'); return; }
      kit.picked = true;
      chip.classList.add('kb-pick');
      chip.setAttribute('aria-pressed', 'true');
      const onZoneKey = (ze) => (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          opts.onDrop(chip, ze);
          if (opts.announce) opts.announce(name + ' placed.');
          endKb();
        } else if (ev.key === 'Escape') { endKb(); }
      };
      kit.handlers = [];
      zones.forEach((z) => {
        z.setAttribute('tabindex', '0');
        const h = onZoneKey(z);
        z.addEventListener('keydown', h);
        kit.handlers.push([z, h]);
      });
      if (opts.announce) opts.announce(name + ' picked up. Tab to a target and press Enter to place it.');
      function endKb() {
        kit.picked = false;
        chip.classList.remove('kb-pick');
        chip.setAttribute('aria-pressed', 'false');
        (kit.handlers || []).forEach(([z, h]) => {
          z.removeEventListener('keydown', h);
          z.removeAttribute('tabindex');
        });
        kit.handlers = [];
        chip.focus();
      }
    });
  }

  /* Whole-tile zone resolution helper: returns the first element in the stack
     under (x,y) matching zoneSelector via closest(), skipping the chip itself. */
  function zoneUnder(x, y, chip, zoneSelector) {
    const stack = document.elementsFromPoint(x, y);
    for (const el of stack) {
      if (el === chip || chip.contains(el)) continue;
      const z = el.closest ? el.closest(zoneSelector) : null;
      if (z) return z;
    }
    return null;
  }

  window.OLS_DRAG = { makeDraggable, zoneUnder };
})();
