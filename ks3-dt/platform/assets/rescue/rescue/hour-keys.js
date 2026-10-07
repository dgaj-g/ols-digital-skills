/* The Rescue, the whole hour. This file loads BEFORE chapter 1's film.js.
   Chapter 1's art test has jump keys for the person judging it (1 to 9, 0, R), set on the document.
   The lesson has none (DFM 297). This listener is added first, so those keys never fire here.
   It does not touch typing: the typing box hears its own keys before the document does. */
document.addEventListener('keydown', function (e) { e.stopImmediatePropagation(); });
