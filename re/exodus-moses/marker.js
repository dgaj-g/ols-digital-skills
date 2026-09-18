/* ============================================================
   Exodus and the Story of Moses — MARKER (the judgement-bearing code)
   Written by the design window (Fable 5.1, 18 Sep 2026). The build
   window copies this file unchanged and runs tests/marker.test.js
   as a gate before the surfaces are built. Any change to a regex
   here must keep every control in the test file passing.

   Marks the three typed answers on the teacher's scheme:
     markWhy(text)          -> { score: 0|1|2, intent, threat }
     markPlagueCount(text)  -> { score: 0|1 }
     markFinalPlague(text)  -> { score: 0|1 }
   Plain script: window.EXODUS_MARKER in a browser, module.exports in node.
   ============================================================ */
(function (root) {
  'use strict';

  /* lower-case, straighten quotes, drop apostrophes (so "wouldn't" -> "wouldnt"),
     turn every other punctuation mark into a space, collapse whitespace */
  function norm(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[‘’‛`]/g, "'")
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /* ---------- Question C: Why did she place Moses in the river Nile? ---------- */
  /* INTENT = what she was trying to do (1 mark on its own) */
  var INTENT = /\b(protect\w*|safe|safer|safety|safely|hid|hide|hides|hiding|hidden|sav(e|ed|es|ing)|rescu\w*|surviv\w*|alive|live|shelter\w*|escap\w*|keep him (from|away|out)|kept him (from|away|out))\b/;
  /* "so he would not be killed / wouldn't die / not be found" also states the intent */
  var NOT_HARMED = /\b(wouldnt|wont|couldnt|didnt|wasnt|would not|will not|could not|did not|was not|not|never)\s+(get\s+|be\s+|been\s+)?(killed|kill|die|dying|drown|drowned|found|discovered|hurt|harmed|murdered|taken|caught)\b/;
  /* THREAT = what she was protecting him from (with INTENT = 2 marks; alone = 1) */
  var THREAT = /\b(pharaoh\w*|king|kill\w*|murder\w*|die|died|dying|death|dead|drown\w*|soldier\w*|egyptian\w*|order\w*|decree\w*|law|command\w*|rule|baby boys|boys|babies|sons|slaughter\w*|hurt|harm\w*|danger\w*|thrown|throw\w*|guards?|army|found|caught|taken)\b/;

  function markWhy(text) {
    var t = norm(text);
    if (!t) return { score: 0, intent: false, threat: false };
    var intent = INTENT.test(t) || NOT_HARMED.test(t);
    var threat = THREAT.test(t);
    var score = intent && threat ? 2 : (intent || threat ? 1 : 0);
    return { score: score, intent: intent, threat: threat };
  }

  /* ---------- Question F (i): How many plagues? ---------- */
  var WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, hundred: 100 };

  function numbersIn(t) {
    var found = {};
    t.replace(/\b(\d+)(st|nd|rd|th)?\b/g, function (_, d) { found[parseInt(d, 10)] = true; return _; });
    t.split(' ').forEach(function (w) { if (WORDS.hasOwnProperty(w)) found[WORDS[w]] = true; });
    return Object.keys(found).map(Number);
  }

  function markPlagueCount(text) {
    var nums = numbersIn(norm(text));
    return { score: nums.length === 1 && nums[0] === 10 ? 1 : 0 };
  }

  /* ---------- Question F (ii): Name the final plague. ---------- */
  var ANGEL = /\bang(el|le|els|les)\b/;                       /* "angle" is the common misspelling */
  var FIRSTBORN = /\bfirst\s?-?\s?born\b|\bfirstborn\b|\beldest\b|\boldest (son|child|boy)\w*\b|\bfirst (son|child)\w*\b/;

  function markFinalPlague(text) {
    var t = norm(text);
    if (!t) return { score: 0 };
    return { score: ANGEL.test(t) || FIRSTBORN.test(t) ? 1 : 0 };
  }

  var api = { norm: norm, markWhy: markWhy, markPlagueCount: markPlagueCount, markFinalPlague: markFinalPlague };
  root.EXODUS_MARKER = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
