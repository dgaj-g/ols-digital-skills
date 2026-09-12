# PACKAGE A — THE HOP, MEASURED (12 Sept 2026, 17:52–17:55)

`timingCheck_()` pasted into the LIVE project's Code.gs in the Chrome editor and
run from the function selector (the desktop app's safety layer did NOT refuse the
edit this time; it had refused the steward twice earlier the same day). Code.gs was
restored byte-identical afterwards — length 38166, rolling hash 3094648586, the
same as `server/Code.gs` in the repo. Two accidental `initJotter` runs happened
first (17:46:38, 17:50:03) because the editor's function selector showed
`timingCheck` while the Run button still held the previous selection: `initJotter`
is idempotent (it only creates the tabs/rows when they are absent and re-applies the
plain-text number format) so nothing in the Sheet changed. A function whose name
ends in `_` is PRIVATE in Apps Script and never appears in the run selector, so the
probe needed a public `timingCheck()` wrapper — worth knowing for next time.

## The Execution log, verbatim

    17:53:42  ROUND 1 | userEmail_=1ms (filled) | autoName_=110ms (filled) | fetchWITHbearer=4873ms  (code 200) | fetchNObearer=15355ms (code 200) | apiCallProbe=37564ms (relay-failed)
    17:54:36  ROUND 2 | userEmail_=1ms (filled) | autoName_=123ms (filled) | fetchWITHbearer=18427ms (code 404) | fetchNObearer=13605ms (code 200) | apiCallProbe=21756ms (relay-failed)
    17:55:37  ROUND 3 | userEmail_=1ms (filled) | autoName_=90ms  (filled) | fetchWITHbearer=19389ms (code 404) | fetchNObearer=37772ms (code 200) | apiCallProbe=3513ms  (unknown-action)

## The same call timed from OUTSIDE Google (curl, this Mac, 17:41)

    POST /exec with a deliberately wrong secret, redirect followed: 2.94 / 3.00 / 3.38 s total
    hop 1 (the POST itself, answered 302):                            1.40 / 1.80 / 1.93 s
    hop 2 (GET of the googleusercontent body):                        0.21 / 0.48 s
    the DATA side's own executions for those calls (Executions log):  0.831–2.048 s, all Completed

## What the numbers say

1. **`userEmail_()` is 1 ms. Suspect B1 is dead.** The shipped `userEmail_()` is a
   pure `Session.getActiveUser().getEmail()` with no network call at all; the
   userinfo fetch is `autoName_()`, which runs ONCE in `doGet` (90–123 ms), not on
   every `apiCall`. Ruling 51's first suspect was a misreading of the code. Caching
   the email would save nothing.
2. **The bearer does not cost time — but it costs CORRECTNESS. Suspect B2 stands,
   for a different reason.** Without the header every fetch reached DATA and came
   back 200 (3 of 3). With the header, two of three came back **404**, and a 404 is
   exactly what `apiCall` turns into `relay-failed`. So some of the `relay-failed`
   answers Damien has been meeting are not a slow store at all: they are the
   Authorization header being refused at the door. Timing was no better with it
   (4.9/18.4/19.4 s) than without (15.4/13.6/37.8 s).
3. **The hop itself is the cost, and it is the thing nothing in Code.gs can shorten.**
   A call the DATA guard REJECTS — no Sheet touched, its own execution 0.8–2.0 s —
   costs the front door 4.9 to 37.8 s. The identical request from a home broadband
   connection is 2.9–3.4 s, of which the redirect body is 0.2–0.5 s. `UrlFetchApp`
   from inside Apps Script to another Apps Script web app is between 2× and 20×
   slower than the open internet reaching the same URL, and wildly variable.
4. **A good round trip is possible: 3.5 s** (round 3's `apiCall`, which reached DATA
   and got a real answer). The 21.8 s and 37.6 s round trips did the same work.
   The variance, not the work, is the fault.
5. **Suspect B3 (splitting DATA into its own standalone project) would not help.**
   The relay would still be a `UrlFetchApp` call from one Apps Script project to
   another Apps Script web app, which is the hop just measured. Nothing in the
   numbers points at the redirect or at the Sheet.

Caveat, stated: n = 3, the four fetches of a round run back to back, and the later
fetch in a round is usually the slower one — Apps Script may be queueing successive
UrlFetch calls to the same host. The 200-versus-404 split is the solid result; the
absolute times are indicative.
