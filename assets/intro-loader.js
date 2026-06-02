/* ============================================================
   OLS Digital Skills — intro overlay loader
   ------------------------------------------------------------
   Drop this script tag into any activity's <head> or end of <body>:

     <script src="../../assets/intro-loader.js"></script>

   Behaviour:
   - Plays the 3-second crest animation once per browser session.
   - Auto-fades into the activity when the video finishes.
   - Tap the overlay or press Escape to dismiss it early (no visible button).
   - Add ?intro to the URL to force-play (handy for demos).
   - Add ?nointro to skip permanently this navigation.
   - Resilient: if the video fails to load, the overlay disappears
     and the activity is shown as normal — no broken state.
   ============================================================ */

(function () {
  // ---- Config ----
  // Two renders of the same animation: landscape (1920×1080) for desktops,
  // portrait (1080×1920) for phones. Pick by the viewport aspect.
  const VIDEO_FILENAME_LANDSCAPE = 'intro.mp4';
  const VIDEO_FILENAME_PORTRAIT  = 'intro-portrait.mp4';
  const isPortrait = window.innerHeight > window.innerWidth;
  const VIDEO_FILENAME = isPortrait ? VIDEO_FILENAME_PORTRAIT : VIDEO_FILENAME_LANDSCAPE;
  const SESSION_KEY = 'ols-intro-seen-v1';
  const FADE_MS = 450;
  const POST_HOLD_MS = 800;  // pause after the video ends so people can read the wordmark
  const DEBUG = false;
  const log = (...a) => { if (DEBUG) console.log('[ols-intro]', ...a); };
  log('loader running, url=', location.href);

  // ---- Skip if the user has already seen it this session ----
  const params = new URLSearchParams(location.search);
  const force = params.has('intro');
  const skip  = params.has('nointro');
  if (skip) { log('skipped via ?nointro'); return; }
  if (!force && sessionStorage.getItem(SESSION_KEY) === '1') { log('skipped — session flag set'); return; }
  log('proceeding to show intro');

  // ---- Resolve path to /assets/intro.mp4 from the loader's own URL ----
  const here = document.currentScript ? document.currentScript.src : '';
  const baseUrl = here.replace(/[^/]+$/, ''); // strip filename, keep trailing /
  const videoSrc = baseUrl + VIDEO_FILENAME;

  // ---- Build overlay ----
  const style = document.createElement('style');
  style.textContent = `
    .ols-intro-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: #0d1f3d;
      display: flex; align-items: center; justify-content: center;
      opacity: 1; transition: opacity ${FADE_MS}ms ease;
      cursor: pointer;
    }
    .ols-intro-overlay.fade-out { opacity: 0; pointer-events: none; }
    .ols-intro-video {
      width: 100%; height: 100%;
      object-fit: contain;
      background: #0d1f3d;
    }
    @media (prefers-reduced-motion: reduce) {
      .ols-intro-overlay { transition: none; }
    }
  `;

  const overlay = document.createElement('div');
  overlay.className = 'ols-intro-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.setAttribute('aria-hidden', 'true');

  const video = document.createElement('video');
  video.className = 'ols-intro-video';
  video.src = videoSrc;
  video.muted = true;            // required for autoplay in most browsers
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');

  overlay.appendChild(video);

  // Insert as early as possible so the overlay covers any unfinished layout
  function attach() {
    if (!document.head) {
      // Document parsing hasn't reached <head> yet (extremely rare for a script
      // tag at body-bottom) — defer one tick
      requestAnimationFrame(attach);
      return;
    }
    document.head.appendChild(style);
    (document.body || document.documentElement).appendChild(overlay);
  }
  attach();

  // ---- Dismissal logic ----
  let dismissed = false;
  function dismiss(reason) {
    if (dismissed) return;
    log('dismiss called, reason=', reason || 'unknown');
    dismissed = true;
    sessionStorage.setItem(SESSION_KEY, '1');
    overlay.classList.add('fade-out');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      style.remove();
    }, FADE_MS + 50);
  }

  // Track playback so we know whether autoplay actually worked
  let startedPlaying = false;
  video.addEventListener('playing', () => { startedPlaying = true; log('playing'); });
  video.addEventListener('ended', () => {
    setTimeout(() => dismiss('ended'), POST_HOLD_MS);
  });
  video.addEventListener('loadedmetadata', () => log('loadedmetadata'));
  video.addEventListener('canplay', () => {
    log('canplay');
    // Re-attempt play in case the first attempt happened before src was ready
    video.play().catch(() => {});
    // If autoplay is blocked, dismiss after a short wait so the activity isn't stuck
    setTimeout(() => {
      if (!startedPlaying && !dismissed) dismiss('autoplay-blocked');
    }, 700);
  });
  // Click anywhere on the overlay dismisses (forgiving UX) — but ignore clicks
  // that happen before the video starts playing (avoids accidental Puppeteer/auto-focus dismiss)
  overlay.addEventListener('click', () => {
    if (video.currentTime > 0.1) dismiss('overlay-click');
    else log('click before playback ignored');
  });
  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dismissed) dismiss('escape');
  });

  // ---- Resilience ----
  // If the video fails to load or play, dismiss after a hard 4s timeout so
  // the activity is never stuck behind a broken overlay.
  const SAFETY_MS = 5500;  // covers video (~3s) + hold (~0.8s) + fade (~0.5s) plus buffer
  setTimeout(() => { if (!dismissed) dismiss('safety-timeout'); }, SAFETY_MS);
  video.addEventListener('error', (e) => { log('video error', video.error); dismiss('video-error'); });
  video.addEventListener('stalled', () => {
    log('stalled, readyState=', video.readyState);
    setTimeout(() => { if (video.readyState < 2 && !dismissed) { dismiss('stall-recovery'); } }, 1500);
  });

  // Some browsers block autoplay even on muted videos under certain policies;
  // catch a rejection and surface a 'tap to play' affordance by just skipping.
  video.play().catch(() => { /* dismiss flow will handle via timeout / error */ });
})();
