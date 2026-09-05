/* The Glass Jotter — content pack: Algebra ("Ink & Balance", quill plum).
   Sources: Mary's Algebra WALTs; MEP Y7 Practice Book B ch16 (linear equations);
   MEP Y8 Practice Book A ch8 (brackets). Methods and layout follow the books:
   the balance rule is quoted verbatim, answers are stated with x on the left,
   and 8.2 Example 1's "Expanding brackets gives / Adding 15 / Dividing by 5"
   layout is reproduced exactly. The brackets-on-both-sides material in s6 is
   authored in M2 style with NO source content — flagged in DESIGN.md §10. */
(function () {
  'use strict';

  // normalised rational {n, d} (INTERFACES "Rational numbers")
  function r(n, d) { return { n: n, d: d || 1 }; }

  window.GJ_CONTENT = window.GJ_CONTENT || {};
  window.GJ_CONTENT.algebra = {
    id: 'algebra',
    title: 'Algebra',
    cover: { accent: 'plum', motif: 'radical' },
    sections: [

      /* ──────────────────────────────── s1 ──────────────────────────────── */
      {
        id: 's1',
        title: 'The language of algebra',
        walt: 'Substitute positive and negative numbers into expressions and formulae',
        // Movie = MEP Y7 16.1 Example 2 (a = 4, b = 7, c = 3) with the book's three
        // boxed notation rules as stamps, then one negative-values case (16.1 Q5 range).
        movie: {
          title: 'Swapping letters for numbers',
          mode: 'paper',
          steps: [
            { say: 'Substituting means swapping each letter for its number. Today: a = 4, b = 7 and c = 3.',
              do: [{ write: { text: 'a = 4      b = 7      c = 3' } }] },
            { say: 'Start gently with 6 + b. Wherever b appears, 7 goes in its place.',
              do: [{ write: { text: '6 + b = 6 + 7 = 13' } }, { tick: { line: 1 } }] },
            { say: '2a + b. Careful — 2a is shorthand. The 2 and the a are multiplied.',
              do: [{ stamp: { text: '2a means 2 × a' } },
                   { write: { text: '2a + b = 2 × 4 + 7' } }] },
            { say: 'Multiply before you add: 2 × 4 = 8, then 8 + 7 = 15.',
              do: [{ write: { text: '= 8 + 7 = 15' } }, { tick: { line: 3 } }] },
            { say: 'ab — two letters written side by side. No hidden plus: they are multiplied.',
              do: [{ stamp: { text: 'ab means a × b' } },
                   { write: { text: 'ab = 4 × 7 = 28' } }, { tick: { line: 4 } }] },
            { say: 'a(b − c) — a letter against a bracket multiplies the whole bracket. Work the bracket out first.',
              do: [{ stamp: { text: 'a(b − c) means a × (b − c)' } },
                   { write: { text: 'a(b − c) = 4 × (7 − 3)' } }] },
            { say: 'Inside the bracket: 7 − 3 = 4. Then 4 × 4 = 16.',
              do: [{ write: { text: '= 4 × 4 = 16' } }, { box: { line: 6 } }] },
            { say: 'Now negatives. New values: b = −1 and d = −4. Find b − d — bracket the −4 as you substitute.',
              do: [{ clear: {} },
                   { write: { text: 'b = −1      d = −4' } },
                   { write: { text: 'b − d = −1 − (−4)' } }] },
            { say: 'Subtracting −4 is the same as adding 4. So −1 + 4 = 3. The brackets saved us.',
              do: [{ write: { text: '= −1 + 4 = 3' } }, { tick: { line: 2 } },
                   { note: { text: 'Subtracting a negative means adding.' } }] }
          ]
        },
        questions: [
          { id: 'q1', type: 'subst', marks: [1, 1],
            prompt: 'Given a = 2 and b = 6, find the value of 3a + 2b. You must show your working.',
            start: '3a + 2b',
            given: { a: r(2), b: r(6) },
            answer: { val: r(18) } },
          { id: 'q2', type: 'subst', marks: [1, 1],
            prompt: 'Given a = 3 and d = −4, find the value of 3a − d. You must show your working.',
            start: '3a − d',
            given: { a: r(3), d: r(-4) },
            answer: { val: r(13) },
            dx: { '5': 'NEG_MUL_SIGN' } },                      // 9 − 4: treated −(−4) as −4
          { id: 'q3', type: 'subst', marks: [2, 1],
            prompt: 'Given a = 7, b = 5 and c = −3, find the value of a(2b − c). You must show your working.',
            start: 'a(2b − c)',
            given: { a: r(7), b: r(5), c: r(-3) },
            answer: { val: r(91) },
            dx: { '49': 'NEG_MUL_SIGN' } },                     // 7 × (10 − 3): lost the negative c
          { id: 'q4', type: 'subst', marks: [1, 1],
            prompt: 'The formula v = u + at gives the final speed of a car. Find v when u = 20, a = −2 and t = 7. You must show your working.',
            start: 'v = u + at',
            given: { u: r(20), a: r(-2), t: r(7) },
            answer: { val: r(6) },
            dx: { '34': 'NEG_MUL_SIGN' } }                      // 20 + 14: (−2) × 7 made positive
        ]
      },

      /* ──────────────────────────────── s2 ──────────────────────────────── */
      {
        id: 's2',
        title: 'Collecting like terms',
        walt: 'Simplify an algebraic expression using addition and subtraction',
        // Movie = MEP Y7 16.1 Example 3 (a)–(d), with the book's rearrangement so
        // like terms sit together and the y = 1y point.
        movie: {
          title: 'Like terms sit together',
          mode: 'paper',
          steps: [
            { say: '2x + 4x. Each term is a bundle of x — two of them, then four more.',
              do: [{ write: { text: '2x + 4x = (x + x) + (x + x + x + x)' } }] },
            { say: 'Six x altogether: 2x + 4x = 6x. Add the numbers in front; the letter stays as it is.',
              do: [{ write: { text: '= 6 × x = 6x' } }, { tick: { line: 1 } }] },
            { say: '5p + 7q − 3p + 2q. Two families of term. Rearrange so like terms sit together — each term keeps its own sign.',
              do: [{ write: { text: '5p + 7q − 3p + 2q' } },
                   { sub: { from: '5p + 7q − 3p + 2q', to: '= 5p − 3p + 7q + 2q', glow: true } }] },
            { say: 'Collect each family: 5 − 3 = 2 lots of p, and 7 + 2 = 9 lots of q.',
              do: [{ write: { text: '= (5 − 3)p + (7 + 2)q = 2p + 9q' } }, { tick: { line: 4 } }] },
            { say: 'y + 8y − 5y. A lone y is one y — write it as 1y while you are learning.',
              do: [{ stamp: { text: 'y means 1y' } },
                   { write: { text: 'y + 8y − 5y = 1y + 8y − 5y' } }] },
            { say: '1 + 8 − 5 = 4, so the answer is 4y.',
              do: [{ write: { text: '= (1 + 8 − 5)y = 4y' } }, { tick: { line: 6 } }] },
            { say: '3t + 4s. Different letters — these are NOT like terms. There is nothing to collect.',
              do: [{ write: { text: '3t + 4s' } },
                   { note: { text: '3t + 4s cannot be simplified.' } }] },
            { say: 'When the terms are unlike, the honest answer is to leave the expression exactly as it stands.',
              do: [{ tick: { line: 7 } }] }
          ]
        },
        questions: [
          { id: 'q5', type: 'simplify', marks: [1, 1],
            prompt: 'Simplify x + 8x − 5x.',
            start: 'x + 8x − 5x',
            answer: { canon: { c2: r(0), c1: r(4), c0: r(0) } } },
          { id: 'q6', type: 'simplify', marks: [1, 1],
            prompt: 'Simplify 4x + 3 + 2x.',
            start: '4x + 3 + 2x',
            answer: { canon: { c2: r(0), c1: r(6), c0: r(3) } },
            dx: { '9x': 'COLLECT_X_NUM' } },                    // swallowed the lone 3 into the x terms
          { id: 'q7', type: 'simplify', marks: [1, 1],
            prompt: 'Simplify fully 6x + 3 − 2x − 1.',
            start: '6x + 3 − 2x − 1',
            answer: { canon: { c2: r(0), c1: r(4), c0: r(2) } },
            dx: { '6x': 'COLLECT_X_NUM' } },                    // 6 + 3 − 2 − 1, everything collapsed
          // The book's 6x + 3y − 2x − y two-family shape, with x² as the second
          // family: the marker's canonical form is a polynomial in x alone
          // (INTERFACES canonSide), so a y term could not be marked.
          { id: 'q8', type: 'simplify', marks: [2, 1],
            prompt: 'Simplify fully 6x² + 3x − 2x² − x.',
            start: '6x² + 3x − 2x² − x',
            answer: { canon: { c2: r(4), c1: r(2), c0: r(0) } },
            dx: { '6x²': 'COLLECT_X_NUM' } }                    // collected unlike families into one
        ]
      },

      /* ──────────────────────────────── s3 ──────────────────────────────── */
      {
        id: 's3',
        title: 'Expanding brackets',
        walt: 'Expand single brackets; simplify an algebraic expression using multiplication',
        // Movie = MEP Y8 8.1 Example 2 (grid, exactly as the book draws it),
        // Examples 3–5, then Jordan's classic slip (8.1 Q4) as a spot-the-slip beat.
        movie: {
          title: 'Three lots of everything',
          mode: 'paper',
          steps: [
            { say: '3(x + 6) means 3 lots of everything in the bracket. The grid keeps us honest — one cell for each term.',
              do: [{ grid: { a: '3', b: ['x', '6'], vals: ['3x', '18'] } }] },
            { say: 'Read the answer off the grid: 3 × x = 3x and 3 × 6 = 18.',
              do: [{ write: { text: '3(x + 6) = 3x + 18' } }, { tick: { line: 0 } }] },
            { say: 'The golden rule: every term inside the bracket must be multiplied by the number outside.',
              do: [{ stamp: { text: 'Multiply EVERY term inside' } }] },
            { say: '4(x − 7). Multiply each term in turn, keeping the sign with its term.',
              do: [{ write: { text: '4(x − 7) = 4 × x − 4 × 7' } },
                   { write: { text: '= 4x − 28' } }, { tick: { line: 2 } }] },
            { say: 'x(8 − x). A letter outside works the same way: x × 8 = 8x, and x × x = x².',
              do: [{ write: { text: 'x(8 − x) = x × 8 − x × x' } },
                   { write: { text: '= 8x − x²' } }, { tick: { line: 4 } }] },
            { say: '(−3)(4 − 2x). The number outside is negative — every sign inside will feel it.',
              do: [{ write: { text: '(−3)(4 − 2x) = (−3) × 4 − (−3) × 2x' } }] },
            { say: '(−3) × 4 = −12. Then subtracting −6x becomes ADDING 6x — a double sign change.',
              do: [{ write: { text: '= −12 − (−6x) = −12 + 6x' } }, { tick: { line: 6 } },
                   { note: { text: 'minus × minus = plus' } }] },
            { say: 'Spot the slip: Jordan writes 3(4x − 8) = 12x − 8. Look closely before you read on.',
              do: [{ clear: {} },
                   { write: { text: '3(4x − 8) = 12x − 8', margin: '(Jordan)' } }] },
            { say: 'Jordan only multiplied the FIRST term. The −8 must be multiplied by 3 as well.',
              do: [{ note: { text: 'Only the first term was multiplied — the −8 needs ×3 too.', red: true } }] },
            { say: 'The correct expansion: 3 × 4x = 12x and 3 × (−8) = −24.',
              do: [{ write: { text: '3(4x − 8) = 12x − 24' } }, { box: { line: 1 } }] }
          ]
        },
        questions: [
          { id: 'q9', type: 'expand', marks: [1, 1],
            prompt: 'Expand 4(x + 6).',
            start: '4(x + 6)',
            answer: { canon: { c2: r(0), c1: r(4), c0: r(24) } },
            dx: { '4x + 6': 'EXPAND_PARTIAL' },
            // fc = render-only grid tiles (the dx map has whole-line wrongs; these are per-cell)
            fc: { a: '4', terms: ['x', '6'], cells: [{ answer: '4x', tiles: ['4x', 'x', '4'] }, { answer: '24', tiles: ['24', '6', '10'] }] } },
          { id: 'q10', type: 'expand', marks: [1, 1],
            prompt: 'Expand 7(3x − 4).',
            start: '7(3x − 4)',
            answer: { canon: { c2: r(0), c1: r(21), c0: r(-28) } },
            dx: { '21x − 4': 'EXPAND_PARTIAL', '21x + 28': 'EXPAND_SIGN' },
            fc: { a: '7', terms: ['3x', '−4'], cells: [{ answer: '21x', tiles: ['21x', '3x', '10x'] }, { answer: '−28', tiles: ['−28', '−4', '+28'] }] } },
          { id: 'q11', type: 'expand', marks: [1, 1],
            prompt: 'Expand (−3)(8 − 2x).',
            start: '(−3)(8 − 2x)',
            answer: { canon: { c2: r(0), c1: r(6), c0: r(-24) } },
            dx: { '−24 − 6x': 'EXPAND_SIGN', '−24 − 2x': 'EXPAND_PARTIAL' },
            fc: { a: '(−3)', terms: ['8', '−2x'], cells: [{ answer: '−24', tiles: ['−24', '24', '−11'] }, { answer: '6x', tiles: ['6x', '−2x', '−6x'] }] } },
          { id: 'q12', type: 'expand', marks: [1, 1],
            prompt: 'Expand x(8 − 2x).',
            start: 'x(8 − 2x)',
            answer: { canon: { c2: r(-2), c1: r(8), c0: r(0) } },
            dx: { '8x': 'EXPAND_PARTIAL', '8x + 2x²': 'EXPAND_SIGN' },
            fc: { a: 'x', terms: ['8', '−2x'], cells: [{ answer: '8x', tiles: ['8x', '8', '16x'] }, { answer: '−2x²', tiles: ['−2x²', '0', '+2x²'] }] } }
        ]
      },

      /* ──────────────────────────────── s4 ──────────────────────────────── */
      {
        id: 's4',
        title: 'Solving equations I',
        walt: 'Solve equations with x on one side',
        // Movie = the balance rule (the book's boxed wording, verbatim, in the caption)
        // + MEP Y7 16.3 Example 1 (a), (e) and (f) — incl. the divide-by-negative beat.
        movie: {
          title: 'The balance rule',
          mode: 'paper',
          steps: [
            { say: 'An equation is a balance. Both pans weigh the same — and our job is to keep it that way.',
              do: [{ balance: { l: 'x + 2', r: '8', tip: 0 } }] },
            { say: 'Whatever you do to one side of an equation, you must also do the same to the other side.',
              do: [{ stamp: { text: 'The Balance Rule' } }, { write: { text: 'x + 2 = 8' } }] },
            { say: 'To leave x alone, subtract 2 — from BOTH sides, or the balance tips.',
              do: [{ balance: { op: '−2', tip: [-6, 0] } },
                   { write: { text: 'x + 2 − 2 = 8 − 2', margin: '(−2)' } }] },
            { say: 'The left pan is just x now: x = 6. Check: 6 + 2 = 8. Balanced.',
              do: [{ balance: { l: 'x', r: '6', tip: 0 } },
                   { write: { text: 'x = 6' } }, { tick: { line: 2 } }] },
            { say: 'Two stages now: 2x + 5 = 11. Undo the + 5 first, then the × 2 — inverse operations, in reverse order.',
              do: [{ clear: {} }, { write: { text: '2x + 5 = 11' } },
                   { write: { text: '2x + 5 − 5 = 11 − 5', margin: '(−5)' } },
                   { write: { text: '2x = 6' } }] },
            { say: 'Now divide both sides by 2.',
              do: [{ write: { text: '2x ÷ 2 = 6 ÷ 2', margin: '(÷2)' } },
                   { write: { text: 'x = 3' } }, { tick: { line: 4 } }] },
            { say: 'A spiky one: 3 − 2x = 7. Subtract 3 from both sides first.',
              do: [{ clear: {} }, { write: { text: '3 − 2x = 7' } },
                   { write: { text: '3 − 2x − 3 = 7 − 3', margin: '(−3)' } },
                   { write: { text: '−2x = 4' } }] },
            { say: 'The x term is −2x, so divide both sides by −2 — the WHOLE coefficient, sign included.',
              do: [{ write: { text: '−2x ÷ (−2) = 4 ÷ (−2)', margin: '(÷ −2)' } },
                   { write: { text: 'x = −2' } }, { box: { line: 4 } }] },
            { say: 'A negative answer is perfectly fine. Check: 3 − 2 × (−2) = 3 + 4 = 7. It balances.',
              do: [{ note: { text: 'Always check by substituting your answer back in.' } }] }
          ]
        },
        questions: [
          { id: 'q13', type: 'solve', marks: [1, 1],
            prompt: 'Solve the equation x + 7 = 12. You must show your working.',
            start: 'x + 7 = 12',
            answer: { x: r(5) },
            dx: { 'x = 19': 'SIGN_FLIP_MOVE' } },               // moved the 7 across unchanged
          { id: 'q14', type: 'solve', marks: [1, 1],
            prompt: 'Solve the equation 4x = 28. You must show your working.',
            start: '4x = 28',
            answer: { x: r(7) },
            dx: { 'x = 24': 'SUB_INSTEAD_DIV' } },              // subtracted the 4 instead of dividing
          { id: 'q15', type: 'solve', marks: [2, 1],
            prompt: 'Solve the equation 2x + 6 = 14. You must show your working.',
            start: '2x + 6 = 14',
            answer: { x: r(4) },
            dx: { 'x + 6 = 7': 'DIV_BEFORE_SUB',                // halved 2x and 14 but not the 6
                  '2x = 20': 'SIGN_FLIP_MOVE' } },
          { id: 'q16', type: 'solve', marks: [2, 1],
            prompt: 'Solve the equation 6x + 2 = −10. You must show your working.',
            start: '6x + 2 = −10',
            answer: { x: r(-2) },
            dx: { '6x = −8': 'SIGN_FLIP_MOVE',
                  'x = 2': 'NEG_MUL_SIGN' } }                   // −12 ÷ 6 with the sign dropped
        ]
      },

      /* ──────────────────────────────── s5 ──────────────────────────────── */
      {
        id: 's5',
        title: 'Solving equations II — letters on both sides',
        walt: 'Solve equations with x on both sides',
        // Movie = MEP Y7 16.3 Example 2 (a) and (b): choose the side with the most x,
        // then the book's boxed convention note (answer stated with x on the left).
        movie: {
          title: 'Letters on both sides',
          mode: 'paper',
          steps: [
            { say: '3x + 2 = 4x − 3. x appears on BOTH sides — first decide which x term to remove.',
              do: [{ write: { text: '3x + 2 = 4x − 3' } }] },
            { say: 'Choose the side with the most x — here the right, with 4x. Removing the smaller 3x keeps x positive.',
              do: [{ note: { text: 'Take the smaller x term from both sides.' } }] },
            { say: 'Subtract 3x from both sides.',
              do: [{ write: { text: '3x + 2 − 3x = 4x − 3 − 3x', margin: '(−3x)' } },
                   { write: { text: '2 = x − 3' } }] },
            { say: 'Add 3 to both sides: 5 = x.',
              do: [{ write: { text: '2 + 3 = x − 3 + 3', margin: '(+3)' } },
                   { write: { text: '5 = x' } }] },
            { say: 'Convention: state your answer with x on the left hand side. 5 = x, so x = 5.',
              do: [{ stamp: { text: 'Write x on the left' } },
                   { write: { text: 'x = 5' } }, { tick: { line: 5 } }] },
            { say: 'The full method on 2x + 7 = 8x − 11. More x on the right, so subtract 2x from both sides.',
              do: [{ clear: {} }, { write: { text: '2x + 7 = 8x − 11' } },
                   { write: { text: '7 = 6x − 11', margin: '(−2x)' } }] },
            { say: 'Add 11 to both sides: 18 = 6x.',
              do: [{ write: { text: '7 + 11 = 6x − 11 + 11', margin: '(+11)' } },
                   { write: { text: '18 = 6x' } }] },
            { say: 'Divide both sides by 6: 3 = x.',
              do: [{ write: { text: '18 ÷ 6 = 6x ÷ 6', margin: '(÷6)' } },
                   { write: { text: '3 = x' } }] },
            { say: 'State it the conventional way round: x = 3. Check: 2 × 3 + 7 = 13 and 8 × 3 − 11 = 13.',
              do: [{ write: { text: 'x = 3' } }, { box: { line: 6 } }] }
          ]
        },
        questions: [
          { id: 'q17', type: 'solve', marks: [2, 1],
            prompt: 'Solve the equation 8x − 1 = 4x + 11. You must show your working.',
            start: '8x − 1 = 4x + 11',
            answer: { x: r(3) },
            dx: { '−1 = 4x + 11': 'BOTHSIDES_ONE_SIDE',         // took 8x from the left only
                  '12x − 1 = 11': 'SIGN_FLIP_MOVE',
                  '4x = 10': 'SIGN_FLIP_MOVE' } },
          { id: 'q18', type: 'solve', marks: [2, 1],
            prompt: 'Solve the equation 3x + 2 + 5x = x + 44. You must show your working.',
            start: '3x + 2 + 5x = x + 44',
            answer: { x: r(6) },
            dx: { '10x = x + 44': 'COLLECT_X_NUM',              // 3 + 2 + 5 collected as x terms
                  '7x = 46': 'SIGN_FLIP_MOVE' } },
          { id: 'q19', type: 'solve', marks: [2, 1],
            prompt: 'Solve the equation 3x + 2 = x − 8. You must show your working.',
            start: '3x + 2 = x − 8',
            answer: { x: r(-5) },
            dx: { '2x = −6': 'SIGN_FLIP_MOVE',
                  '4x = −10': 'SIGN_FLIP_MOVE' } },
          { id: 'q20', type: 'solve', marks: [2, 1],
            prompt: 'Solve the equation 7x + 2 = 5x + 5. You must show your working.',
            start: '7x + 2 = 5x + 5',
            answer: { x: r(3, 2) },                             // the section's one fraction answer
            dx: { '2x = 7': 'SIGN_FLIP_MOVE',
                  '12x + 2 = 5': 'SIGN_FLIP_MOVE' } }
        ]
      },

      /* ──────────────────────────────── s6 ──────────────────────────────── */
      {
        id: 's6',
        title: 'Brackets and building equations',
        walt: 'Solve equations containing a single bracket; solve equations with brackets on both sides of the equation',
        // Movie = MEP Y8 8.2 Example 1 (the book's EXACT narration and layout),
        // 8.2 Example 3 (Gilda form-and-solve), then an authored
        // brackets-on-both-sides walkthrough (no source content — DESIGN.md §10).
        movie: {
          title: 'Undoing a bracket',
          mode: 'paper',
          steps: [
            { say: '5(x − 3) = 35. A bracket equation — deal with the bracket first and it becomes one we already know.',
              do: [{ write: { text: '5(x − 3) = 35' } }] },
            { say: 'Expanding brackets gives 5x − 15 = 35.',
              do: [{ write: { text: '5x − 15 = 35', margin: '(expand)' } }] },
            { say: 'Adding 15 to both sides gives 5x = 50.',
              do: [{ write: { text: '5x = 50', margin: '(+15)' } }] },
            { say: 'Dividing by 5 gives x = 10.',
              do: [{ write: { text: 'x = 10', margin: '(÷5)' } }, { tick: { line: 3 } }] },
            { say: 'Gilda thinks of a number, adds 7, then multiplies by 4. Her answer is 64. Build the equation from her story.',
              do: [{ clear: {} },
                   { write: { text: 'x  →  x + 7  →  4(x + 7)', margin: '(her story)' } },
                   { write: { text: '4(x + 7) = 64' } }] },
            { say: 'Expanding brackets gives 4x + 28 = 64. Subtracting 28 from both sides gives 4x = 36.',
              do: [{ write: { text: '4x + 28 = 64', margin: '(expand)' } },
                   { write: { text: '4x = 36', margin: '(−28)' } }] },
            { say: 'Dividing by 4 gives x = 36/4 = 9. Gilda thought of 9.',
              do: [{ write: { text: 'x = 36/4 = 9', margin: '(÷4)' } }, { tick: { line: 4 } }] },
            { say: 'Now brackets on BOTH sides: 3(x + 2) = 2(x − 1). New ground — but it is two ideas you already own.',
              do: [{ clear: {} }, { write: { text: '3(x + 2) = 2(x − 1)' } }] },
            { say: 'Expanding brackets gives 3x + 6 = 2x − 2. Two expansions, one line.',
              do: [{ write: { text: '3x + 6 = 2x − 2', margin: '(expand)' } }] },
            { say: 'Letters on both sides now. Subtract 2x, then subtract 6. Check: 3 × (−6) = −18 = 2 × (−9).',
              do: [{ write: { text: 'x + 6 = −2', margin: '(−2x)' } },
                   { write: { text: 'x = −8', margin: '(−6)' } }, { box: { line: 3 } }] }
          ]
        },
        questions: [
          { id: 'q21', type: 'solve', marks: [2, 1],
            prompt: 'Solve the equation 6(x + 7) = 50. You must show your working.',
            start: '6(x + 7) = 50',
            answer: { x: r(4, 3) },                             // 8/6 = 4/3, as in 8.2 Example 2
            dx: { '6x + 7 = 50': 'EXPAND_PARTIAL',
                  '6x = 92': 'SIGN_FLIP_MOVE' } },
          { id: 'q22', type: 'solve', marks: [2, 1],
            prompt: 'Solve the equation 5(x − 2) = 3(x + 4). You must show your working.',
            start: '5(x − 2) = 3(x + 4)',
            answer: { x: r(11) },
            dx: { '5x − 2 = 3x + 4': 'EXPAND_PARTIAL',
                  '5x + 10 = 3x + 12': 'EXPAND_SIGN' } },
          { id: 'q23', type: 'form', marks: [2, 1],
            prompt: 'A rectangle has length 18 cm and width x cm. Its perimeter is 48 cm. Form an equation in x and solve it to find the width of the rectangle. You must show your working.',
            // accept entries are canonically equivalent — any of them earns the forming mark
            form: { accept: ['2x + 36 = 48', '2(x + 18) = 48', 'x + 18 + x + 18 = 48'] },
            answer: { x: r(6) },
            dx: { '2x = 84': 'SIGN_FLIP_MOVE' },
            fc: { choices: ['2x + 36 = 48', '2x + 18 = 48', 'x + 36 = 48'] } },
          { id: 'q24', type: 'form', marks: [2, 1],
            prompt: 'Three angles together make a straight line. They measure 3x°, 80° and 2x°. This is your Angles knowledge meeting your Algebra: form an equation in x and solve it. You must show your working.',
            form: { accept: ['3x + 80 + 2x = 180', '5x + 80 = 180'] },
            answer: { x: r(20) },
            dx: { '3x + 80 + 2x = 360': 'STRAIGHT_360',
                  '85x = 180': 'COLLECT_X_NUM',                 // 3 + 80 + 2 collected as x terms
                  '5x = 260': 'SIGN_FLIP_MOVE' },
            fc: { choices: ['3x + 80 + 2x = 180', '3x + 80 + 2x = 360', '5x + 80 = 90'] } }
        ]
      }
    ]
  };

  /* "I can…" self-evaluation chips — pupil-voice restatements of each section's
     WALT (content-safe; Mary may reword). Surfaced at exercise end and in the
     teacher's Insights. The ids are stable — they key the saved self-eval, so do
     not renumber them once pupils have used the activity. */
  (function () {
    var CANS = {
      s1: [{ id: 'g1c1', text: 'I can substitute positive numbers into an expression' },
           { id: 'g1c2', text: 'I can substitute negative numbers carefully' }],
      s2: [{ id: 'g2c1', text: 'I can collect like terms together' },
           { id: 'g2c2', text: 'I can handle minus signs when simplifying' }],
      s3: [{ id: 'g3c1', text: 'I can expand a single bracket' },
           { id: 'g3c2', text: 'I can expand a bracket with a letter in front, like x(8 − 2x)' }],
      s4: [{ id: 'g4c1', text: 'I can solve an equation with x on one side' },
           { id: 'g4c2', text: 'I can do the same to both sides to stay balanced' }],
      s5: [{ id: 'g5c1', text: 'I can collect the x-terms onto one side' },
           { id: 'g5c2', text: 'I can solve when x is on both sides' }],
      s6: [{ id: 'g6c1', text: 'I can solve an equation with a bracket' },
           { id: 'g6c2', text: 'I can solve with brackets on both sides' }]
    };
    window.GJ_CONTENT.algebra.sections.forEach(function (s) { s.cans = CANS[s.id] || []; });
  })();
})();
