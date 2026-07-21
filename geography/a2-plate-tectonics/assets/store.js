/* ============================================================
   Progress store — localStorage persistence for the platform.
   Tracks per-chapter activity completion, checkpoint scores,
   collected Data Bank facts, and spec-statement self-ticks.
   No pupil identity is stored — device-local only.
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'ols-a2pt-v1';

  function blank() {
    return { chapters: {}, bank: {}, spec: {}, lastLoc: null };
  }

  let state = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(blank(), JSON.parse(raw));
  } catch (_) { /* private mode / blocked storage — run in-memory */ }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    }, 150);
  }

  function chapter(chId) {
    if (!state.chapters[chId]) state.chapters[chId] = { visited: false, done: {}, checkpoint: null };
    return state.chapters[chId];
  }

  const Store = {
    markVisited(chId) { chapter(chId).visited = true; save(); },
    lastLoc() { return state.lastLoc; },
    setLoc(loc) { state.lastLoc = loc; save(); },

    /* activity completion — key is `${chapterId}:${blockIndex}` */
    isDone(chId, key) { return !!chapter(chId).done[key]; },
    markDone(chId, key) { chapter(chId).done[key] = true; save(); },

    recordCheckpoint(chId, score, total) {
      const ch = chapter(chId);
      const best = ch.checkpoint;
      if (!best || score > best.score) ch.checkpoint = { score, total };
      save();
    },
    checkpoint(chId) { return chapter(chId).checkpoint; },

    /* Data Bank */
    collectFact(id) { state.bank[id] = true; save(); },
    hasFact(id) { return !!state.bank[id]; },
    bankCount() { return Object.keys(state.bank).length; },

    /* spec-statement self-assessment: 0 none, 1 shaky, 2 secure */
    setSpec(id, level) { state.spec[id] = level; save(); },
    specLevel(id) { return state.spec[id] || 0; },

    /* chapter progress: fraction of interactive blocks completed (checkpoint
       counts as one block; a passed checkpoint also marks it) */
    chapterProgress(chId, totalActivities) {
      const ch = chapter(chId);
      if (!totalActivities) return ch.visited ? 1 : 0;
      const done = Object.keys(ch.done).length;
      return Math.min(1, done / totalActivities);
    },

    resetAll() { state = blank(); save(); },
    _state: () => state,
  };

  window.OLS_STORE = Store;
})();
