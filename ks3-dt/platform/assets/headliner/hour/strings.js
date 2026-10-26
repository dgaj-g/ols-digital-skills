/* THE HEADLINER — every user-facing string in the hour. Final wording lives HERE; the spec quotes this file.
   Rules: ≤14 words a sentence (DFM 292), ≤40 prose words a screen, plain words first then the technical word (DFM 335),
   full descriptive sentences, a number never without its thing (DFM 294). Keys are stable: the cold reads name them. */
(function (g) {
  g.S = {
    lesson: { title: 'The Headliner', strip: 'J2 · Lesson 6 · The Headliner', slot: 'Festival Planner' },
    chapters: [
      { id: 'donow', label: 'Do now', min: 5 },
      { id: 'open', label: 'The job', min: 3 },
      { id: 'c1', label: '1 · The grid', min: 7 },
      { id: 'c2', label: '2 · The copy', min: 9 },
      { id: 'c3', label: '3 · The decision', min: 7 },
      { id: 'c4', label: '4 · The call', min: 8 },
      { id: 'c5', label: '5 · The pin', min: 9 },
      { id: 'poster', label: 'The poster', min: 3 },
      { id: 'close', label: 'Finish', min: 8 }
    ],
    common: { next: 'Next', start: 'Start', check: 'Check', fill: 'Fill down', back: 'Back', hint: 'Give me a hint', hint2: 'Another hint', hint3: 'Show me the answer', gotIt: 'Got it', tryAgain: 'Try again', skip: 'I know this. Skip.', watched: 'I watched it. Now me.', youAreHere: 'You are here', partOf: 'Part {n} of {total}', minsLeft: '{m} minutes left in this hour', pause: 'Pause', paused: 'Paused. Nothing is lost. Press Pause again to carry on.', welcomeBack: 'Welcome back. You were on {where}. Your sheet is exactly as you left it.', outOfTime: 'Time is nearly up. Finish this part. Then press Finish in the strip at the top. The other parts stay open for next time.', xp: '+{n} points', done: 'Done', lighter: 'Running lighter for this computer.', nextTime: 'Next time', soundOn: 'Sound is on', soundOff: 'Sound is off', doneWhen: 'This part is done when {what}.' },
    donow: { kicker: 'Do now', intro: 'Five questions from earlier lessons. Click the answer you think is right.', progress: 'Question {n} of 5', right: 'Right.', wrong: 'Not that one. The right answer is shown.', finish: 'The warm-up is done. Now for today’s job.', button: 'On to the job' },
    opening: {
      kicker: 'J2 · Lesson 6',
      line1: 'Today you make a computer do your sums for you.',
      line2: 'When one number changes, it redoes every sum on its own.',
      line3: 'People use this to plan parties, trips and whole festivals.',
      button: 'Show me the job'
    },
    story: {
      kicker: '7:02 pm · a message',
      from: 'Aoife · Lumen festival',
      b1: 'Hi! Aoife from the Lumen festival here. Our planner’s laptop just died.',
      b2: 'The money plan was on it. Tickets go on sale at 8 tonight.',
      b3: 'Ivy Rain is the headliner, the main act. By 8 her manager needs a yes or no. Can we afford her?',
      readAll: 'Read them all',
      reply: 'Reply: Send me the numbers',
      numbersKicker: '7:03 pm · the numbers',
      numbersIntro: 'Here is everything I know.',
      numbers: ['Tickets: 1,200 at £25 each', 'Car parking: 300 cars at £5 each', 'T-shirts: 400 at £12 each', 'Stage and lights: £14,000', 'Toilets and fences: £6,000', 'Ivy Rain’s fee: £18,000'],
      numbersButton: 'Open the plan'
    },
    tour: {
      kicker: 'A quick look round',
      s1: 'This grid is a sheet. Every box has a name. This one is B3: column B, row 3. Letters run along the top. Numbers run down the side.',
      s2: 'This is the sum bar, also called the formula bar. Type sums here. A sum starts with = so the computer works it out.',
      s3: 'Press Enter. The box then shows the answer, not the sum you typed.',
      done: 'Start part 1'
    },
    sheet: { formulaBar: 'Sum bar', locked: 'This box is not yours to change', tabPlan: 'Plan', tabMerch: 'Shop', plan: { A2: 'Thing', B2: 'How many', C2: 'Each £', D2: 'Total £', A3: 'Tickets', A4: 'Car parking', A5: 'T-shirts', A6: 'Money in', A8: 'Stage and lights', A9: 'Toilets and fences', A10: 'Ivy Rain’s fee', A11: 'Money out', A12: 'Profit', A13: 'Book her?' }, merch: { A1: 'VAT rate', A2: 'Item', B2: 'Price £', C2: 'With VAT £', A3: 'T-shirt', A4: 'Hoodie', A5: 'Tote bag', A6: 'Poster' } },
    c1: {
      title: 'Part 1 · The grid',
      goal: 'In this part you make one box do one sum. It is done when D3 shows the ticket money.',
      show1: 'Watch. 1,200 tickets sell at £25 each. The * key means times.',
      showDemo: '=B3*C3',
      show2: 'Press Enter and the box shows 30000. The sum stays hidden behind it.',
      ask: 'Your turn. Click D3, type =B3*C3 and press Enter.',
      h1: 'Click D3 first. Then type the = sign.',
      h2: 'After the =, type B3, then *, then C3.',
      h3: 'Type exactly this, then press Enter:',
      h3code: '=B3*C3',
      judge: { empty: 'D3 is still empty. Click it, type the sum, press Enter.', typed: 'The number is right, but you typed it. Type a sum instead. Start with =, then the box names.', error: 'The computer cannot read that sum. Check the = and the box names.', wrong: 'That sum gives the wrong number. Multiply tickets by price: B3 * C3.', 'no-follow': 'The number is right, but the sum uses the wrong boxes. Use B3 and C3, so it changes when they change.', ok: 'D3 works out 30,000. That is £30,000 of ticket money.' },
      trickKicker: '7:09 pm · Aoife',
      trick: 'Sorry! Tickets are 1,300, not 1,200. Can you change it?',
      predict: 'Before you change B3, what will D3 show?',
      predictOptions: ['32,500', '30,000', '31,300'],
      predictRight: 'Yes. 1,300 times 25 is 32,500. Now change B3 and see.',
      predictWrong: 'Not that one. 1,300 times 25 is 32,500. Now change B3 and see.',
      change: 'Click B3, type 1300 and press Enter.',
      changeJudge: { ok: 'D3 changed on its own. You never touched it.', no: 'B3 still says 1,200. Click it, type 1300, press Enter.' },
      back: 'Aoife again: 1,200 was right after all. Sorry! Change B3 back to 1200.',
      backJudge: { ok: 'Back to 30,000. Every box that uses B3 changes when B3 changes.', no: 'B3 is not 1,200 yet. Click it, type 1200, press Enter.' },
      doneLine: 'Part 1 is done. Your sum changes when the numbers change.'
    },
    c2: {
      title: 'Part 2 · The copy',
      goal: 'In this part you copy a sum down and add things up. It is done when D12 shows the profit. Profit is the money left after everything is paid.',
      show1: 'D4 and D5 need the same sum, one row lower.',
      show2: 'Watch. Drag the little square at the bottom right of D3 down.',
      show3: 'The sum is copied. D4 reads =B4*C4: the box names moved down too.',
      ask: 'Drag the square on D3 down to D5. Or click D3, then Fill down.',
      h1: 'Click D3. The small square sits at its bottom right corner.',
      h2: 'Press on the square and drag down over D4 and D5. Let go.',
      h3: 'Click D3, then press Fill down. It does the drag for you.',
      judge: { empty: 'D4 and D5 are still empty. Drag the square down, or press Fill down.', ok: 'D4 shows £1,500 for car parking and D5 shows £4,800 for T-shirts. One drag made both sums.', 'fill-wobble': 'D4 or D5 shows the wrong number. Fill from D3 again.', typed: 'One of those was typed by hand. Fill from D3 so they are sums.' },
      ask2: 'D6 is the money in. Add the three totals: type =D3+D4+D5.',
      h2_1: 'Click D6 and type =. Then type the three box names with a + between each.',
      h2_2: 'The three boxes are D3, D4 and D5.',
      h2_3: 'Type exactly this, then press Enter:',
      h2_3code: '=D3+D4+D5',
      judge2: { empty: 'D6 is still empty.', typed: 'The number is right, but you typed it. Type a sum, so it changes when the boxes change.', error: 'The computer cannot read that sum. Check the = and the box names.', wrong: 'That gives the wrong total. Add D3, D4 and D5.', 'no-follow': 'The number is right, but the boxes are wrong. Add D3, D4 and D5.', ok: '£36,300 is coming in. A shorter way is =SUM(D3:D5). It adds every box from D3 to D5.' },
      ask3: 'D11 is the money out. Add D8, D9 and D10 in D11, with + or SUM.',
      h3_1: 'Click D11 and start with =.',
      h3_2: 'Type either =D8+D9+D10 or =SUM(D8:D10). Both work.',
      h3_3: 'Type exactly this, then press Enter:',
      h3_3code: '=D8+D9+D10',
      judge3: { empty: 'D11 is still empty.', typed: 'The number is right, but you typed it. Type a sum instead.', error: 'The computer cannot read that sum. Check the = and the box names.', wrong: 'That gives the wrong total. Add D8, D9 and D10.', 'no-follow': 'The number is right, but the boxes are wrong. Add D8, D9 and D10.', ok: '£38,000 is going out. Now work out the number Aoife is waiting for.' },
      ask4: 'D12 is the profit: money in take away money out. Write that sum.',
      h4_1: 'Profit is D6 minus D11. Minus is the - key.',
      h4_2: 'Start with =, then D6, then -, then D11.',
      h4_3: 'Type exactly this, then press Enter:',
      h4_3code: '=D6-D11',
      judge4: { empty: 'D12 is still empty.', typed: 'The number is right, but you typed it. Type a sum instead.', error: 'The computer cannot read that sum. Check the = and the box names.', wrong: 'That is not the profit. Take D11 away from D6: D6 - D11.', 'no-follow': 'The number is right, but the boxes are wrong. Use D6 and D11.', ok: 'D12 shows minus £1,700. The festival would lose money if it booked Ivy Rain.' },
      aoifeKicker: '7:18 pm · Aoife',
      aoife: 'Minus £1,700? Oh no. Hold on, I need to think. Don’t go anywhere.',
      doneLine: 'Part 2 is done. Every total changes when its numbers change.'
    },
    c3: {
      title: 'Part 3 · The decision',
      goal: 'In this part the sheet answers a yes-or-no question by itself. It is done when D13 shows words.',
      show1: 'IF asks a question, then picks words.',
      showDemo: '=IF(B3>1000,"Big night","Quiet night")',
      show2: 'The > sign asks: is B3 more than 1,000? Yes, so it says Big night.',
      show3: 'The brackets hold the question, then the yes words, then the no words.',
      ask: 'In D13: if the profit is more than 0, say Book her. Otherwise say Not yet.',
      h1: 'Type =IF( first. Then type the question D12>0, then a comma.',
      h2: 'Next type "Book her" in quote marks, then a comma. Then type "Not yet" in quote marks. Last, type a closing bracket.',
      h3: 'Type exactly this, then press Enter:',
      h3code: '=IF(D12>0,"Book her","Not yet")',
      judge: { empty: 'D13 is still empty.', typed: 'You typed the words. Use an IF sum instead, so the words change when the numbers change.', error: 'The computer cannot read that. Check the brackets, commas and quote marks.', wrong: 'It says Book her, but the profit is below zero. Check the order: yes words first, then no words.', 'no-follow': 'The words are right for now, but the question must use D12, the profit.', ok: 'D13 says Not yet. The sheet made its first decision. It will change when the numbers do.' },
      doneLine: 'Part 3 is done. The sheet can answer Aoife now. She is ringing you.'
    },
    c4: {
      title: 'Part 4 · The call',
      goal: 'In this part Aoife asks three questions on the phone. You get 90 seconds for each. It is done when she has three answers.',
      ring: 'Aoife is calling',
      pickUp: 'Answer',
      intro: 'Ivy Rain’s manager is on the phone with three questions. You have 90 seconds for each one. If time runs out, Aoife asks again with no clock.',
      timer: '{s} seconds left',
      q: [
        { ask: 'If we charge £30 a ticket, do we make money?', predict: 'What do you think, before you try?', change: 'Change C3 to 30, then read D13.', yes: 'Tell her: yes, we make £4,300', no: 'Tell her: no, we lose money', right: 'yes', line: 'At £30 the profit is £4,300, and D13 says Book her.' },
        { ask: 'He says at £30 only 1,000 tickets sell. Do we still make money?', predict: 'What do you think, before you try?', change: 'Change B3 to 1000, then read D13.', yes: 'Tell her: yes, we still make money', no: 'Tell her: no, we lose £1,700', right: 'no', line: 'The profit is minus £1,700 again. 1,000 tickets at £30 earn the same as 1,200 at £25.' },
        { ask: 'Last one. If 1,100 tickets sell at £32, do we make money?', predict: 'What do you think, before you try?', change: 'Change B3 to 1100 and C3 to 32, then read D13.', yes: 'Tell her: yes, we make £3,500', no: 'Tell her: no', right: 'yes', line: 'The profit is £3,500, so D13 says Book her. Aoife is cheering down the phone.' }
      ],
      predictYes: 'Yes', predictNo: 'No',
      predictedRight: 'Your guess was right. The sheet agrees.', predictedWrong: 'The sheet shows something different. Good thing you checked.',
      notYet: 'The sheet does not say that yet. Change the number and read D13 again.',
      wrongAnswer: 'Read D13 again. Your answer does not match it.',
      timeout: 'Time ran out and the call ended. Aoife rings back with the same question. There is no clock this time.',
      hintsOpen: 'Hints are on now. Press Give me a hint if you need one.',
      doneLine: 'Part 4 is done. Aoife has her three answers.'
    },
    c5: {
      title: 'Part 5 · The pin',
      goal: 'In this part you add VAT, a tax, to the shop prices. It is done when one box changes every price.',
      intro1: 'Click the Shop tab. It holds what we sell. VAT is a tax added to every price.',
      intro2: 'The VAT rate is in B1. Today it is 0.2, which means 20%. It can change later.',
      show1: 'To add VAT, multiply the price by (1 + rate). The rate is 0.2, so that is times 1.2. For the T-shirt, type =B3*(1+B1).',
      showDemo: '=B3*(1+B1)',
      ask: 'Click C3 and type the T-shirt sum: =B3*(1+B1). Press Enter.',
      h1: 'Click C3, then type = and B3.',
      h2: 'Then type *, then (1+B1) with the brackets.',
      h3: 'Type exactly this, then press Enter:',
      h3code: '=B3*(1+B1)',
      judge: { empty: 'C3 is still empty.', typed: 'The number is right, but you typed it. Type a sum instead.', error: 'The computer cannot read that. Check the brackets.', wrong: 'That is not £14.40. Multiply the price by (1 + rate): B3*(1+B1).', 'no-follow': 'The number is right, but the boxes are wrong. Use B3 and B1.', ok: 'C3 shows £14.40 for a T-shirt. Now fill it down to C6 for the other items.' },
      ask2: 'Fill C3 down to C6.',
      wobble: 'Look at C4, C5 and C6. Something has gone wrong.',
      wobbleWhy1: 'Click C4. Its sum reads =B4*(1+B2). The copy moved B1 down to B2.',
      wobbleWhy2: 'But B2 is the word Price, not the rate. The rate must not move.',
      pin1: 'Pin the rate box so copies cannot move it. Write it as $B$1. The two $ signs are the pin.',
      pin2: 'A pinned box stays put when the sum is copied.',
      knew: 'You already pinned B1. Here is why it matters:',
      ask3: 'Click C3, type =B3*(1+$B$1), press Enter. Then fill down to C6.',
      h3_1: 'The $ sign is Shift and 4 on the keyboard.',
      h3_2: 'Put $ before the B and $ before the 1: $B$1.',
      h3_3: 'Type exactly this, press Enter, then Fill down:',
      h3_3code: '=B3*(1+$B$1)',
      judge3: { empty: 'C3 is still empty.', typed: 'One price is typed by hand. Fill from C3 so they are sums.', error: 'The computer cannot read that. Check the brackets and the $ signs.', wrong: 'C3 is not £14.40. Check the brackets.', 'no-follow': 'C3 must use B3 and $B$1.', 'fill-wobble': 'A lower row is still wrong. Does C3 say $B$1, with both $ signs? Then fill again.', ok: 'The four prices are 14.40, 36.00, 9.60 and 6.00. All four use the one pinned box.' },
      whatifKicker: '7:31 pm · Aoife',
      whatif: 'VAT might go up to 25% next year. What would the hoodie cost?',
      predict: 'Before you change B1, what will C4 show?',
      predictOptions: ['37.50', '36.00', '37.00'],
      predictRight: 'Yes. The hoodie is 30, and 30 times 1.25 is 37.50. Now change B1 and see.',
      predictWrong: 'Not that one. The hoodie is 30, and 30 times 1.25 is 37.50. Now change B1 and see.',
      change: 'Click B1, type 0.25 and press Enter.',
      changeJudge: { ok: 'Every price changed. One pinned box controls all of them.', no: 'B1 is not 0.25 yet. Click it, type 0.25, press Enter.' },
      doneLine: 'Part 5 is done. You can pin a box, and you know why.'
    },
    poster: {
      title: 'Your poster',
      intro: 'Here is the night you made possible.',
      festival: 'Lumen', sub: 'One night of lanterns and music by the lough', headliner: 'Ivy Rain', tickets: 'Tickets £32', stamp: 'HEADLINER BOOKED',
      madeBy: 'Plan by you · {today}',
      rename: 'Rename the festival if you like',
      button: 'Finish the hour'
    },
    close: {
      badgesTitle: 'Badges earned',
      badges: [
        { id: 'sum-writer', name: 'Sum Writer', line: 'You wrote a sum with =.' },
        { id: 'the-copy', name: 'The Copy', line: 'You copied a sum down. Its names moved.' },
        { id: 'decider', name: 'Decider', line: 'The sheet chose with IF.' },
        { id: 'the-call', name: 'The Call', line: 'You answered three questions fast.' },
        { id: 'the-pin', name: 'The Pin', line: '$B$1 stayed put when copied.' }
      ],
      recapTitle: 'You can now',
      recap: ['Write a sum with = and box names.', 'Change a number and every sum changes.', 'Fill down a sum. Its names move too.', 'IF makes a box pick words.', '$B$1 pins a box. Copies cannot move it.'],
      exitTitle: 'Last five questions',
      exitIntro: 'Five questions on today. Click the answer you think is right.',
      exit: [
        { stem: 'Which key starts a sum in a box?', options: ['=', '+', 'Enter'] },
        { stem: 'B3 holds 1,200 and C3 holds 25. What does =B3*C3 show?', options: ['30000', '1225', 'B3*C3'] },
        { stem: 'D3 holds =B3*C3. You fill it down one row. What does D4 read?', options: ['=B4*C4', '=B3*C3', '=B3*C4'] },
        { stem: 'What do the $ signs in $B$1 do?', options: ['Pin the box so copies still use B1', 'Turn B1 into money', 'Add VAT to B1'] },
        { stem: 'D12 is -1700. What does =IF(D12>0,"Book her","Not yet") show?', options: ['Not yet', 'Book her', '-1700'] }
      ],
      exitRight: 'Right.', exitWrong: 'Not that one. The right answer is shown.',
      feltTitle: 'How did it go?',
      feltIntro: 'Pick what is true for you.',
      felt: ['I can write a sum with box names.', 'I can say why fill down moves names.', 'I know what $B$1 does.'],
      feltScale: ['Not yet', 'Nearly', 'Yes'],
      difficulty: 'How hard was today?', difficultyScale: ['Easy', 'About right', 'Hard'],
      comment: 'A note for your teacher',
      freeTitle: 'Free time', free: 'Try other acts. The Sunday Club costs £12,000. Marlow costs £9,000. Change D10 and watch D13.',
      end: 'The hour is over. Everything you made is saved.'
    }
  };
})(typeof window !== 'undefined' ? window : global);

/* Added 26 Oct 2026 after the first measured walk: a second test in Part 1, two predictions in Part 2, a live test of IF in Part 3, a second what-if in Part 5, and three free-time challenges. */
(function (S) {
  Object.assign(S.c1, { trick2: 'One more. The ticket price goes up to £30.', predict2: 'What will D3 show?', predictOptions2: ['36,000', '30,000', '35,000', '1,230'], predictRight2: 'Yes. 1,200 times 30 is 36,000. Now change C3 and see.', predictWrong2: 'It will show 36,000, because 1,200 times 30 is 36,000. Now change C3 and see.', change2: 'Click C3, type 30, press Enter.', changeJudge2: { ok: 'D3 jumped to 36,000. You changed one number and the sum did the rest.', no: 'C3 should hold 30. Click C3, type 30, press Enter.' }, back2: 'Put the price back. Click C3, type 25, press Enter.', backJudge2: { ok: 'D3 is back to 30,000. You ran two tests and never retyped a sum.', no: 'C3 should hold 25 again.' } });
  Object.assign(S.c2, { predictD6: 'Before you write it: 30,000 + 1,500 + 4,800 is…', predictD6Options: ['36,300', '35,300', '36,800', '31,500'], predictD6Right: 'Yes, 36,300. Now make D6 say it.', predictD6Wrong: 'It is 36,300. Now make D6 say it.', predictD12: 'Money in is 36,300. Money out is 38,000. Profit will be…', predictD12Options: ['below zero', 'above zero', 'exactly zero'], predictD12Right: 'Yes. Out is bigger than in. Write the sum and see the minus sign.', predictD12Wrong: 'Out is bigger than in, so profit sits below zero. Write the sum and see.' });
  Object.assign(S.c3, { testKicker: 'Test it', test1: 'Hang on. What if Ivy Rain’s fee was £9,000 instead?', testPredict: 'What will D13 say? Pick one.', testOptions: ['Book her', 'Not yet'], testRight: 'Yes. A cheaper fee leaves a profit above zero. Now try it.', testWrong: 'A cheaper fee leaves a profit above zero, so D13 says Book her. Now try it.', testChange: 'Click D10, type 9000, press Enter.', testChangeJudge: { ok: 'D12 is now 7,300 and D13 says Book her. You did not retype any sum.', no: 'D10 should hold 9000.' }, testBack: 'Sadly her fee is £18,000. Put D10 back.', testBackJudge: { ok: 'D13 says Not yet again. Your sheet now answers in words.', no: 'D10 should hold 18000 again.' } });
  Object.assign(S.c5, { predict2: 'Now you change the hoodie price in B4 to £40. Which boxes in column C change?', predict2Options: ['C4 only', 'C3 to C6', 'B1 and C4', 'None'], predict2Right: 'C4 only. Each row uses its own price and the one pinned rate.', predict2Wrong: 'Only C4. Each row uses its own price and the one pinned rate.', change2: 'Click B4, type 40, press Enter.', change2Judge: { ok: 'C4 now shows 50.00. You changed one price, so only C4 changed.', no: 'B4 should hold 40.' } });
  Object.assign(S.close, { freeOf: 'Challenge {n} of 3', wholePounds: 'Use whole pounds only for this one.', free: [
    { text: 'Find the lowest whole-pound ticket price that still books Ivy Rain. On the Plan tab, try prices in C3.', ok: 'You found it. At £27 a ticket you book her with £700 to spare.', over: 'Booked at £{v}. Can a lower price still do it?', under: 'Not yet at £{v}. Go up a pound.', reset: 'For this one, keep 1,200 tickets and the £18,000 fee as they are.' },
    { text: 'Put the price back to £25. Now find the fewest tickets that still book her. Try numbers in B3.', ok: 'You found it. 1,269 tickets at £25 each book her.', over: 'Booked at {v} tickets. Can fewer do it?', under: 'Not yet at {v} tickets. Try more.', reset: 'For this one, keep the price at £25 and the fee at £18,000.' },
    { text: 'You choose. Change any numbers, but keep D13 saying Book her. Then tell your teacher your plan.' } ] });
})(window.S);

/* Deck, teacher brief and Do-Now pool items — added 26 Oct 2026 for the cold read. */
(function () {
  var S = window.S;
  S.deck = [
  {
    "id": "d1",
    "kind": "title",
    "kicker": "OUR LADY'S GRAMMAR SCHOOL · DIGITAL TECHNOLOGY",
    "heading": "The Headliner",
    "sub": "Today you make a computer do your sums for you. When one number changes, it redoes every sum on its own. People use this to plan parties, trips and whole festivals.",
    "notes": "SAY: read the sentences on the slide aloud, once, then stop. Say nothing about what happens on screen. The hour is a surprise."
  },
  {
    "id": "d2",
    "kind": "bullets",
    "heading": "What you will do today",
    "bullets": [
      "Write a sum that uses box names, like =B3*C3.",
      "Change one number and watch every sum change.",
      "Copy a sum down a column.",
      "Make a box answer in words with IF.",
      "Pin a box with $ signs so it does not move when you copy a sum."
    ],
    "notes": "SAY: these are the five things. Do not explain them now. The screens teach them one at a time, with an example before every task."
  },
  {
    "id": "d3",
    "kind": "bullets",
    "heading": "Headphones on",
    "bullets": [
      "The hour has sound. Put your headphones on now.",
      "No headphones? Press the speaker button to turn sound off.",
      "Every sound also has its words on the screen. With the sound off, you can still read every word."
    ],
    "notes": "SAY: headphones on. If you have none, turn the sound off with the speaker button."
  },
  {
    "id": "d4",
    "kind": "bullets",
    "heading": "On your own",
    "bullets": [
      "You work through your own screens at your own pace.",
      "Stuck? Press Give me a hint. The last hint shows the exact sum.",
      "Hints never cost you anything."
    ],
    "notes": "SAY: this is your own hour. Stuck means press the hint button, not put your hand up."
  },
  {
    "id": "d5",
    "kind": "bullets",
    "heading": "Read every screen",
    "bullets": [
      "Every screen says what to do and when it is done.",
      "The strip at the top shows which part you are in.",
      "Lost? Read the screen again from the top."
    ],
    "notes": "SAY: nothing on these screens is decoration. Read every line."
  },
  {
    "id": "d6",
    "kind": "stop",
    "beacon": "1",
    "heading": "Start now",
    "bullets": [
      "Open the link and sign in with your school account.",
      "Start with the five warm-up questions.",
      "When a screen says Finish, you are done."
    ],
    "notes": "SAY: go. Leave the deck on this slide for the rest of the hour."
  },
  {
    "id": "d7",
    "kind": "bullets",
    "heading": "The last screens",
    "bullets": [
      "When you reach the badges, you are nearly finished.",
      "Five last questions on today. Then a short page about how it went.",
      "Press Finish. Everything you made is saved."
    ],
    "notes": "SAY: when you see your badges, you have about ten minutes left. Finish the last questions."
  },
  {
    "id": "d8",
    "kind": "closer",
    "heading": "Before you leave",
    "sub": "See you in a fortnight.",
    "bullets": [
      "Your work is saved. You have nothing to print.",
      "Finished early? The last screen offers more to try."
    ],
    "notes": "SAY: everything is saved. See you in a fortnight."
  }
];
  S.brief = {
  "purpose": [
    "Pupils learn to use a spreadsheet that works out the answers for them. They write a sum with box names, such as =B3*C3. They change one number and every sum that uses it changes. They fill down, which copies a sum down a column. They use IF to make a box answer in words. They pin a box by writing $B$1, so a copied sum keeps pointing at that box.",
    "Pupils make the money plan for a one-night festival and decide whether it can book the headliner, the main act, Ivy Rain. Once the headliner is booked, the pupils see a poster. The poster stays on the pupil\'s screen. Nothing prints."
  ],
  "prepare": [
    {
      "title": "Nothing to print",
      "text": "Each pupil needs the link, signed in with the school account, and headphones if they have them. The deck is optional."
    },
    {
      "title": "Do not give away the story",
      "text": "The slides do not tell the story. Please do not describe what happens on the pupils’ screens. After the warm-up, the pupils’ first screen says what the hour is for. That screen uses the same words as slide 1."
    }
  ],
  "resources": [
    {
      "label": "The lesson",
      "what": "This is the pupils’ lesson, J2 Lesson 6, on the platform. Each pupil opens one link and signs in with the school account.",
      "href": ""
    },
    {
      "label": "The deck",
      "what": "The deck has eight slides and tells no story. Slide 6 says Start now. Leave slide 6 on the board for the whole hour.",
      "href": ""
    }
  ],
  "runningTheHour": [
    {
      "part": "Do-Now",
      "mins": 5,
      "text": "The platform asks five questions from earlier lessons. They self-mark and nothing is recorded against the pupil.",
      "say": "Five warm-up questions. Click the answer you think is right."
    },
    {
      "part": "The job",
      "mins": 5,
      "text": "After the warm-up, a screen says what the hour is for. Then the pupil opens the story, and a tour of the spreadsheet follows over three screens.",
      "say": "Read every screen. A screen moves on only when you press its button."
    },
    {
      "part": "Parts 1 to 3",
      "mins": 20,
      "text": "Pupils first write a sum with box names. Then they fill down, which copies a sum down a column, and add totals. Then they use IF. Every part shows a worked example before any task. The last hint gives the exact sum to type.",
      "say": "Stuck? Press Give me a hint. The last hint shows you the sum."
    },
    {
      "part": "Part 4",
      "mins": 8,
      "text": "Aoife from the festival rings with three questions. Pupils get 90 seconds for each one. If the clock runs out, the same question comes back with no clock and the hints turn on. The pupil loses nothing.",
      "say": "If the clock runs out, you get the same question back with no clock."
    },
    {
      "part": "Part 5",
      "mins": 10,
      "text": "Pupils add VAT, a tax, to the prices on the Shop tab. They fill the sum down, and the prices go wrong on purpose: in the copied sum, B1 moves to B2. Then the pupil pins B1 by writing $B$1, and the prices come out right.",
      "say": "Watch what the copy does to B1."
    },
    {
      "part": "Finishing",
      "mins": 12,
      "text": "The pupil finishes with a poster, badges, a recap, five last questions and a short page on how the hour went. Pupils who finish early get three free tasks on the sheet.",
      "say": "When you reach the badges, you are nearly done."
    }
  ],
  "atAGlance": [
    {
      "part": "Do-Now",
      "what": "Five recap questions"
    },
    {
      "part": "Part 1",
      "what": "Write =B3*C3. Then two tests: guess the answer, change a number, check the guess."
    },
    {
      "part": "Part 2",
      "what": "Fill down, SUM, the profit in D12"
    },
    {
      "part": "Part 3",
      "what": "IF in D13 decides whether to book the headliner"
    },
    {
      "part": "Part 4",
      "what": "Three timed questions from Aoife"
    },
    {
      "part": "Part 5",
      "what": "VAT on the Shop tab and the $B$1 pin"
    },
    {
      "part": "Close",
      "what": "Poster, badges, recap, exit ticket"
    }
  ],
  "goesWrong": [
    {
      "q": "A pupil typed the number instead of a sum.",
      "a": "The screen says so and asks for a sum. Point the pupil to the Give me a hint button. Do not tell the pupil the sum."
    },
    {
      "q": "The 90-second clock ran out.",
      "a": "The same question comes back with no clock. The pupil loses nothing."
    },
    {
      "q": "The sheet looks wrong after fill down in Part 5.",
      "a": "This is meant to happen. In the copied sum, B1 moved to B2. The next screen shows the pupil how to pin it."
    },
    {
      "q": "A pupil finished early.",
      "a": "The pupil can try three free tasks on the sheet. They find the lowest ticket price that still books the headliner. They find the fewest tickets that still book the headliner. Then they make a plan of their own."
    },
    {
      "q": "No headphones.",
      "a": "The speaker button turns sound off. Every sound has its words on screen too."
    }
  ]
};
  S.recapPool = [
    { id: 'r-j2-601', lesson: 'j2-06', stem: 'In a sheet, B5 holds 300 and C5 holds 5. Which sum in D5 shows 1,500?', options: ['=B5*C5', '=B5+C5', '=B5/C5'] },
    { id: 'r-j2-602', lesson: 'j2-06', stem: 'In a sheet, D3 holds =B3*C3. You change the number in B3. What happens to D3?', options: ['It changes on its own', 'It stays the same', 'It goes blank'] },
    { id: 'r-j2-603', lesson: 'j2-06', stem: 'In D5 you type =B5*C5, then fill it down one row. What does D6 read?', options: ['=B6*C6', '=B5*C5', '=B5*C6'] },
    { id: 'r-j2-604', lesson: 'j2-06', stem: 'In a sheet, D12 holds 7,300. In D13 you type =IF(D12>0,"Book her","Not yet"). What does D13 show?', options: ['Book her', 'Not yet', '7,300'] },
    { id: 'r-j2-605', lesson: 'j2-06', stem: 'A sum in C3 uses the rate in B1. You fill it down to C6. Which box name stays the same in every copy?', options: ['$B$1', 'B1', 'B2'] }
  ];
})();

/* Added 26 Oct 2026 for the spec: strings the platform shows round the hour; the prototype does not render them. */
(function (S) { Object.assign(S.common, { carryOn: 'Carry on', startAgain: 'Start again' }); })(window.S);
