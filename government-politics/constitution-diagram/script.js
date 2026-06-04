/* ============================================================
   The US Constitution Diagram — Government & Politics (CCEA A2)
   ------------------------------------------------------------
   An interactive, EDITABLE "Constitution diagram": pupils click a
   branch, a check, or a principle and write their own notes and
   real-life examples. Work auto-saves (localStorage), can be saved
   to a file, and shared by a link that carries the whole diagram.
   "Model answer" fills every box with content built from the
   teacher's own resources. A "Test yourself" quiz covers the
   essential-knowledge test.

   Pure HTML/CSS/JS. No build step, no external services. Works from
   file://. All content is traceable to the uploaded source material.
   ============================================================ */

(function () {
  'use strict';

  // ----- Student answer palette (teacher's requested colours) -----
  // black, dark blue, purple, dark green, dark red
  const PALETTE = ['#1A1A1A', '#1A3A6B', '#5B2A86', '#1E6B3B', '#8E1F23'];
  const PALETTE_NAMES = ['Black', 'Dark blue', 'Purple', 'Dark green', 'Dark red'];

  // ======================================================
  //  NODE DATA  (content authored from the uploaded sources)
  // ======================================================
  // Field shape: { key, label, hint, exemplar }
  // Check nodes use a `dirs` array (two directions) instead of fields.

  const BRANCHES = [
    {
      id: 'branch-legislative', kind: 'branch', accent: 'leg',
      eyebrow: 'Article I · Congress makes the law',
      title: 'The Legislative Branch',
      intro: 'Congress is the <strong>bicameral</strong> (two-chamber) legislature of the federal government. It makes the law and is made up of the House of Representatives and the Senate.',
      fields: [
        {
          key: 'role', label: 'The two chambers &amp; their roles',
          hint: 'members in each chamber, length of term, how members are chosen, main jobs',
          exemplar:
            'Congress is bicameral — two chambers:\n' +
            '• House of Representatives — 435 members, two-year term. Representation by population: each member represents a congressional district, reviewed after each 10-year census (California has 52; Wyoming and South Dakota have 1). Members must be 25+ and a US citizen for 7+ years.\n' +
            '• Senate — 100 members, six-year term (one third elected every two years). Geographic representation: 2 Senators per state, agreed in the Connecticut Compromise. Members must be 30+ and a US citizen for 9+ years.\n' +
            'Main roles: representation, legislation (making law) and scrutiny of the executive.'
        },
        {
          key: 'people', label: 'Key people &amp; make-up (119th Congress, 2025&ndash;27)',
          hint: 'the Speaker, the leaders in each chamber, and the party numbers',
          exemplar:
            'Make-up: Senate — Republicans 53, Democrats 45, Independents 2 (both independents caucus with the Democrats). House — Republicans 219, Democrats 215, 1 vacancy.\n' +
            '• House Speaker: Mike Johnson (R)\n' +
            '• House Majority Leader: Steve Scalise (R)\n' +
            '• House Minority Leader: Hakeem Jeffries (D)\n' +
            '• President of the Senate: Vice-President J D Vance (R) — holds the casting vote in a tie\n' +
            '• Senate President pro tempore: Chuck Grassley (R)\n' +
            '• Senate Majority Leader: John Thune (R)\n' +
            '• Senate Minority Leader: Chuck Schumer (D)'
        }
      ]
    },
    {
      id: 'branch-executive', kind: 'branch', accent: 'exec',
      eyebrow: 'Article II · The President carries out the law',
      title: 'The Executive Branch',
      intro: 'The executive branch carries out and enforces the law. Article II states that &lsquo;the executive Power shall be vested in a President of the United States&rsquo;.',
      fields: [
        {
          key: 'role', label: 'Who is in it &amp; what it does',
          hint: 'who leads it, which bodies belong to it, how the President is elected',
          exemplar:
            'The executive branch carries out and enforces laws. It includes the President (the Chief Executive), the Vice-President, the Cabinet, the Executive Office of the President (EXOP), and the federal departments and agencies.\n' +
            'The President is elected for a fixed four-year term (indirectly, through the Electoral College) and cannot serve more than two terms. The next presidential election is November 2028.'
        },
        {
          key: 'people', label: 'Key people &amp; main powers',
          hint: 'who is President and Vice-President now, and the President&rsquo;s powers and limits',
          exemplar:
            '• President: Donald Trump (Republican) — took office January 2025\n' +
            '• Vice-President: J D Vance (Republican)\n' +
            'Main powers: propose legislation, veto bills, make appointments to federal posts (including judges), negotiate treaties, act as commander-in-chief, and grant pardons and issue executive orders.\n' +
            'Main limits: Congress (the power of the purse, confirming appointments, overriding vetoes, impeachment) and the Supreme Court (judicial review).'
        }
      ]
    },
    {
      id: 'branch-judicial', kind: 'branch', accent: 'jud',
      eyebrow: 'Article III · The Supreme Court interprets the law',
      title: 'The Judicial Branch',
      intro: 'The judiciary interprets the law. The Supreme Court is the highest court of the federal judiciary.',
      fields: [
        {
          key: 'role', label: 'What it is &amp; its role',
          hint: 'what the Supreme Court is, how many Justices, whether they are impartial',
          exemplar:
            'The judiciary interprets the law. The Supreme Court is the highest federal court and has 9 Justices. Judges are required to be politically impartial, though the media often label them liberal or conservative from their past rulings. There is currently a 6&ndash;3 conservative majority.'
        },
        {
          key: 'power', label: 'Its key power: judicial review',
          hint: 'what judicial review is, and what an &lsquo;interpretative amendment&rsquo; means',
          exemplar:
            'Judicial review is the power of the courts to set aside acts of the executive or legislature that conflict with the Constitution. It is the Court&rsquo;s key check on the other branches.\n' +
            'Because the Constitution is short (just over 7,000 words) and vague, the Court can change the meaning of its words over time through judicial review — an &lsquo;interpretative&rsquo; (informal) amendment, rather than a formal change to the text.'
        }
      ]
    }
  ];

  const CHECKS = [
    {
      id: 'check-exec-leg', kind: 'check',
      title: 'Congress &amp; the President',
      eyebrow: 'Checks &amp; balances · the key relationship',
      intro: 'The most important relationship in the system. Congress and the President each hold powers that limit the other — &lsquo;separated institutions sharing powers&rsquo;.',
      dirs: [
        {
          from: 'President', to: 'Congress',
          checksExemplar:
            '• Can propose legislation (recommend measures to Congress).\n' +
            '• Can veto legislation passed by Congress.\n' +
            '• Can call special sessions of Congress.\n' +
            '• Makes appointments to federal posts.\n' +
            '• Negotiates foreign treaties.',
          examplesExemplar:
            'The veto is the main check: only a two-thirds vote in both houses can override it. (The War Powers Act 1973 was passed over President Nixon&rsquo;s veto — overrides are rare.)'
        },
        {
          from: 'Congress', to: 'the President',
          checksExemplar:
            '• Can override a presidential veto (two-thirds of both houses).\n' +
            '• Confirms executive appointments (Senate).\n' +
            '• Ratifies treaties (Senate, two-thirds).\n' +
            '• Appropriates money — the &lsquo;power of the purse&rsquo;.\n' +
            '• Can declare war.\n' +
            '• Can impeach and remove the President.',
          examplesExemplar:
            'Impeachment: Donald Trump was impeached twice by the House (2019 and 2021). Conviction needs a two-thirds Senate vote, which was not reached, so he was acquitted both times — as was Bill Clinton. The Senate can also reject the President&rsquo;s nominees and Congress can refuse to fund the President&rsquo;s priorities.'
        }
      ]
    },
    {
      id: 'check-exec-jud', kind: 'check',
      title: 'The President &amp; the Courts',
      eyebrow: 'Checks &amp; balances',
      intro: 'The President shapes the courts through appointments; the courts can rule the President&rsquo;s actions unlawful.',
      dirs: [
        {
          from: 'President', to: 'the Courts',
          checksExemplar:
            '• Appoints federal judges, including Supreme Court Justices.\n' +
            '• Can grant pardons to federal offenders.',
          examplesExemplar:
            'Appointments shape the Court for decades — recent appointments helped create the current 6&ndash;3 conservative majority. The presidential pardon has become increasingly controversial owing to claims of abuse.'
        },
        {
          from: 'the Courts', to: 'the President',
          checksExemplar:
            '• Can declare executive actions — or the actions of the President&rsquo;s subordinates — unconstitutional.',
          examplesExemplar:
            'Through judicial review the Supreme Court can strike down an executive order or action it judges to breach the Constitution.'
        }
      ]
    },
    {
      id: 'check-leg-jud', kind: 'check',
      title: 'Congress &amp; the Courts',
      eyebrow: 'Checks &amp; balances',
      intro: 'Congress can discipline and try to overrule the courts; the courts can strike down the laws Congress makes.',
      dirs: [
        {
          from: 'Congress', to: 'the Courts',
          checksExemplar:
            '• Creates the lower federal courts.\n' +
            '• Approves appointments of federal judges (Senate).\n' +
            '• Can impeach and remove judges.\n' +
            '• Can propose constitutional amendments to overrule a judicial decision.',
          examplesExemplar:
            'Proposing an amendment is a weak check because amendments are so hard to pass — e.g. the Sixteenth Amendment (income tax, 1913) overturned an 1895 Court ruling, but this is rare. Eight members of the judiciary have been successfully impeached.'
        },
        {
          from: 'the Courts', to: 'Congress',
          checksExemplar:
            '• Can declare Acts of Congress unconstitutional.',
          examplesExemplar:
            'Judicial review lets the Court strike down a law passed by Congress if it conflicts with the Constitution (e.g. in US v Windsor the Court declared part of the Defense of Marriage Act unconstitutional).'
        }
      ]
    }
  ];

  // Principle chips, in two groups
  const PRINCIPLES = [
    {
      group: 'The US Constitution 1787 — key principles',
      items: [
        { id: 'p-codified', title: 'Codified &amp; vague', tag: 'A single, short document',
          exemplar: 'The USA has a codified constitution: it is written in a single document, agreed at the Philadelphia Convention in 1787. It is also short (just over 7,000 words) and contains many vague clauses, which leaves room for interpretation by the Supreme Court.' },
        { id: 'p-entrenchment', title: 'Entrenchment', tag: 'Hard to change',
          exemplar: 'The Constitution is entrenched — deliberately difficult to amend, which protects it from short-term political change. Only 27 amendments have passed in over 230 years.' },
        { id: 'p-amendment', title: 'Amendment process', tag: 'Formal &amp; informal',
          exemplar: 'Formal amendment: a proposal needs a two-thirds majority in both houses of Congress and ratification by three-quarters of state legislatures. Only 27 have passed; the first ten (1791) are the Bill of Rights.\nInformal / interpretative amendment: through judicial review the Supreme Court changes the meaning of the Constitution&rsquo;s words without changing the text.' },
        { id: 'p-elastic', title: 'Elastic Clause', tag: 'Necessary &amp; Proper',
          exemplar: 'Also called the Necessary and Proper Clause (Article I, Section 8). It lets Congress make laws that are &lsquo;necessary and proper&rsquo; to carry out its enumerated powers, allowing federal authority to expand over time. It is the source of implied powers.' },
        { id: 'p-supremacy', title: 'Supremacy Clause', tag: 'Federal law is supreme',
          exemplar: 'The Supremacy Clause establishes that the Constitution and federal law take priority over conflicting state law.' },
        { id: 'p-limited', title: 'Limited government', tag: 'Restraints on power',
          exemplar: 'The idea that government restrictions on personal liberty and intervention in the economy should be kept to a minimum and set out in law. In the US the Ninth and Tenth Amendments set out this principle.' },
        { id: 'p-separation', title: 'Separation of powers', tag: 'Articles I&ndash;III',
          exemplar: 'Political power is separated between the three branches so each can check the others and prevent dictatorial government. More accurately, it is the institutions and personnel that are separate, not the powers — Neustadt called it &lsquo;separated institutions sharing powers&rsquo;. Article I = legislature, Article II = executive, Article III = judiciary.' },
        { id: 'p-checks', title: 'Checks and balances', tag: 'Each branch limits the others',
          exemplar: 'A system that gives each branch — legislature, executive and judiciary — the means partially to control the power of the others, to resist encroachments on its own powers and to maintain democratic government.\n(Add your real-life examples using the Checks buttons between the three branches above.)' },
        { id: 'p-federalism', title: 'Federalism', tag: 'Power shared by levels',
          exemplar: 'A system in which political power is divided between a national (federal) government and state governments, each with its own area of jurisdiction.' },
        { id: 'p-statepowers', title: 'Reserve &amp; concurrent powers', tag: 'Federal vs state',
          exemplar: 'States&rsquo; rights / reserve powers: areas the Constitution reserves for the states alone. Concurrent powers: powers exercised by both the federal and state governments (for example, taxation).' },
        { id: 'p-enumerated', title: 'Enumerated &amp; implied powers', tag: 'Listed vs inferred',
          exemplar: 'Enumerated powers: powers explicitly delegated to the federal government, mostly listed in the first three articles. Implied powers: powers not written down but considered &lsquo;necessary and proper&rsquo; to carry out the enumerated powers (from the Elastic Clause).' },
        { id: 'p-bill', title: 'Bill of Rights', tag: 'The first 10 amendments',
          exemplar: 'The first ten amendments, added in 1791, to protect citizens against an over-powerful federal government. States had been reluctant to accept a strong central government, so the Bill of Rights &lsquo;sugared the constitutional pill&rsquo;.' },
        { id: 'p-judreview', title: 'Judicial review', tag: 'Courts vs the Constitution',
          exemplar: 'The power of the courts to set aside acts of the executive or legislature that conflict with a higher authority — the Constitution. In the US it usually means the Supreme Court ruling on whether legislation is constitutional.' },
        { id: 'p-connecticut', title: 'Connecticut Compromise', tag: 'How Congress is shaped',
          exemplar: 'The agreement at the Philadelphia Convention that settled representation in Congress: equal representation in the Senate (2 per state) to reassure the smaller, less populous states, and representation by population in the House. It is why every state has an equal voice in the Senate.' },
        { id: 'p-electoral', title: 'Electoral College', tag: 'Electing the President',
          exemplar: 'The President is not elected by national popular vote but indirectly by the Electoral College — 538 electors, with a majority of 270 needed to win. Most states use &lsquo;winner-takes-all&rsquo;. A candidate can win the popular vote but lose the presidency (e.g. Hillary Clinton in 2016).' }
      ]
    },
    {
      group: 'How the system works in practice',
      items: [
        { id: 'p-parties', title: 'Republicans &amp; Democrats', tag: 'The two main parties',
          exemplar: 'Republicans (the GOP, founded 1854): more conservative on moral issues; favour lower taxes and less regulation; strongest in the central and southern states.\nDemocrats (founded 1828): more liberal on moral issues; more willing to support tax rises and government intervention; strongest in the north-east and on the Pacific coast.' },
        { id: 'p-govtypes', title: 'United &amp; divided government', tag: 'Who controls what',
          exemplar: 'United government: one party controls the presidency, the Senate and the House (the 119th Congress is united — the Republicans control all three, by narrow margins).\nDivided government: one party holds the presidency while another controls Congress.\nDivided Congress: one party controls the Senate and the other the House (as in the 118th Congress).' },
        { id: 'p-gridlock', title: 'Gridlock', tag: 'Legislation stalls',
          exemplar: 'When it becomes difficult to pass effective legislation because the legislature is evenly divided, or because Congress and the President are in conflict (often when they are from different parties). The President may then regularly veto Congress&rsquo;s bills.' },
        { id: 'p-bipartisan', title: 'Bipartisanship &amp; partisanship', tag: 'Cooperation vs conflict',
          exemplar: 'Bipartisanship: close cooperation between the two parties — often crucial when government is divided.\nPartisanship: the opposite — parties refuse to compromise, with high party discipline and members grouping together to oppose the other side.' },
        { id: 'p-polarisation', title: 'Polarisation', tag: 'The parties drift apart',
          exemplar: 'The growing distance between the two parties on policy, ideology and values. US politics has become more polarised, with the two sides moving towards their &lsquo;poles&rsquo; and very few politicians left in the middle ground.' },
        { id: 'p-supermajority', title: 'Supermajority', tag: 'More than half needed',
          exemplar: 'When more than a simple majority is needed to win a vote — built in by the Founders, who feared a &lsquo;tyranny of the majority&rsquo;. Examples: the two-thirds (Congress) and three-quarters (states) needed for a formal amendment, and the two-thirds Senate vote needed to convict in an impeachment trial.' },
        { id: 'p-filibuster', title: 'Filibuster', tag: 'Talking a bill out',
          exemplar: 'A Senate tactic where opponents of a bill delay or block a vote by extending debate. Sixty votes are needed to end a filibuster (to pass a &lsquo;cloture&rsquo; motion).' }
      ]
    }
  ];

  // Lookup: id -> node
  const NODE = {};
  BRANCHES.forEach(n => NODE[n.id] = n);
  CHECKS.forEach(n => NODE[n.id] = n);
  PRINCIPLES.forEach(g => g.items.forEach(p => NODE[p.id] = Object.assign({ kind: 'principle' }, p)));

  // The list of (nodeId, fieldKey) pairs used for exemplar / dot logic
  function fieldKeysFor(node) {
    if (node.kind === 'branch') return node.fields.map(f => f.key);
    if (node.kind === 'principle') return ['def'];
    if (node.kind === 'check') {
      const keys = [];
      node.dirs.forEach((d, i) => { keys.push('d' + i + '-checks'); keys.push('d' + i + '-ex'); });
      return keys;
    }
    return [];
  }

  function exemplarFor(node, fieldKey) {
    if (node.kind === 'branch') { const f = node.fields.find(f => f.key === fieldKey); return f ? f.exemplar : ''; }
    if (node.kind === 'principle') return node.exemplar;
    if (node.kind === 'check') {
      const m = fieldKey.match(/^d(\d+)-(checks|ex)$/);
      if (!m) return '';
      const d = node.dirs[+m[1]];
      return m[2] === 'checks' ? d.checksExemplar : d.examplesExemplar;
    }
    return '';
  }

  // ======================================================
  //  STATE
  // ======================================================
  const LS_KEY = 'ols-us-constitution-v1';
  // state.notes[nodeId][fieldKey] = { t: text, c: colourIndex }
  let state = { notes: {} };
  let saveTimer = null;

  function setNote(nodeId, fieldKey, text, colourIdx) {
    if (!state.notes[nodeId]) state.notes[nodeId] = {};
    const trimmed = (text || '');
    if (trimmed.trim() === '') {
      // keep colour if present but drop empty text; remove entirely if nothing
      delete state.notes[nodeId][fieldKey];
      if (Object.keys(state.notes[nodeId]).length === 0) delete state.notes[nodeId];
    } else {
      state.notes[nodeId][fieldKey] = { t: trimmed, c: colourIdx || 0 };
    }
  }
  function getNote(nodeId, fieldKey) {
    return (state.notes[nodeId] && state.notes[nodeId][fieldKey]) || null;
  }
  function nodeHasNotes(nodeId) {
    return !!(state.notes[nodeId] && Object.keys(state.notes[nodeId]).length);
  }

  function saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    markSaved(true);
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const obj = JSON.parse(raw); if (obj && obj.notes) state = obj; }
    } catch (e) {}
  }
  function scheduleSave() {
    markSaved(false);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveLocal, 500);
  }

  const saveStateEl = document.getElementById('save-state');
  function markSaved(saved) {
    if (!saveStateEl) return;
    saveStateEl.textContent = saved ? 'All changes saved' : 'Saving…';
    saveStateEl.classList.toggle('is-dirty', !saved);
  }

  // ======================================================
  //  RENDER  (diagram chrome + note dots)
  // ======================================================
  const principlesWrap = document.getElementById('principles');

  function renderPrinciples() {
    principlesWrap.innerHTML = '';
    PRINCIPLES.forEach(group => {
      const stage = document.createElement('div');
      stage.className = 'stage chips-group';
      const cap = document.createElement('p');
      cap.className = 'stage-caption';
      cap.innerHTML = group.group;
      stage.appendChild(cap);
      const grid = document.createElement('div');
      grid.className = 'chips';
      group.items.forEach(p => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.dataset.node = p.id;
        b.innerHTML = '<span class="chip-name">' + p.title + '</span><span class="chip-tag">' + p.tag + '</span>';
        grid.appendChild(b);
      });
      stage.appendChild(grid);
      principlesWrap.appendChild(stage);
    });
  }

  function refreshDots() {
    Object.keys(NODE).forEach(id => {
      const has = nodeHasNotes(id);
      document.querySelectorAll('[data-node="' + id + '"]').forEach(el => {
        el.classList.toggle('has-notes', has);
      });
    });
  }

  // ======================================================
  //  DRAWER (editing a node)
  // ======================================================
  const drawer = document.getElementById('drawer');
  const drawerScrim = document.getElementById('drawer-scrim');
  const drawerHead = document.getElementById('drawer-head');
  const drawerEyebrow = document.getElementById('drawer-eyebrow');
  const drawerTitle = document.getElementById('drawer-title');
  const drawerBody = document.getElementById('drawer-body');
  const drawerClose = document.getElementById('drawer-close');
  let lastFocus = null;
  let currentNodeId = null;

  function makeField(nodeId, fieldKey, label, hint, placeholderLead) {
    const wrap = document.createElement('div');
    wrap.className = 'field';

    const lab = document.createElement('label');
    lab.className = 'field-label';
    lab.innerHTML = label + (hint ? ' <span class="field-hint">— ' + hint + '</span>' : '');
    const taId = 'ta-' + nodeId + '-' + fieldKey;
    lab.setAttribute('for', taId);
    wrap.appendChild(lab);

    const existing = getNote(nodeId, fieldKey);
    let colourIdx = existing ? (existing.c || 0) : 0;

    // colour swatches
    const bar = document.createElement('div');
    bar.className = 'field-toolbar';
    const sl = document.createElement('span');
    sl.className = 'swatch-label';
    sl.textContent = 'Colour:';
    bar.appendChild(sl);
    const sw = document.createElement('div');
    sw.className = 'swatches';
    PALETTE.forEach((col, i) => {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'swatch' + (i === colourIdx ? ' is-on' : '');
      s.style.background = col;
      s.title = PALETTE_NAMES[i];
      s.setAttribute('aria-label', 'Colour your answer ' + PALETTE_NAMES[i]);
      s.addEventListener('click', () => {
        colourIdx = i;
        sw.querySelectorAll('.swatch').forEach(x => x.classList.remove('is-on'));
        s.classList.add('is-on');
        ta.style.color = PALETTE[i];
        commit();
      });
      sw.appendChild(s);
    });
    bar.appendChild(sw);
    wrap.appendChild(bar);

    const ta = document.createElement('textarea');
    ta.id = taId;
    ta.value = existing ? existing.t : '';
    ta.style.color = PALETTE[colourIdx];
    ta.placeholder = placeholderLead || ('Write your answer here…');
    wrap.appendChild(ta);

    function autosize() { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }
    function commit() {
      setNote(nodeId, fieldKey, ta.value, colourIdx);
      scheduleSave();
      refreshDots();
    }
    ta.addEventListener('input', () => { autosize(); commit(); });
    // size once shown
    requestAnimationFrame(autosize);
    setTimeout(autosize, 60);

    return wrap;
  }

  function openNode(nodeId) {
    const node = NODE[nodeId];
    if (!node) return;
    const wasClosed = drawer.hidden;
    if (wasClosed) lastFocus = document.activeElement;
    currentNodeId = nodeId;

    drawerHead.className = 'drawer-head drawer-head--' + (node.accent || node.kind);
    drawerEyebrow.innerHTML = node.eyebrow || '';
    drawerTitle.innerHTML = node.title;
    drawerBody.innerHTML = '';

    if (node.intro) {
      const intro = document.createElement('p');
      intro.className = 'node-intro';
      intro.innerHTML = node.intro;
      drawerBody.appendChild(intro);
    }

    if (node.kind === 'branch') {
      node.fields.forEach(f => {
        drawerBody.appendChild(makeField(nodeId, f.key, f.label, f.hint,
          'Write your summary here. Try to include: ' + stripTags(f.hint) + '.'));
      });
    } else if (node.kind === 'principle') {
      drawerBody.appendChild(makeField(nodeId, 'def',
        'In your own words', 'explain the term and, if you can, give an example',
        'Explain this term in your own words…'));
    } else if (node.kind === 'check') {
      node.dirs.forEach((d, i) => {
        const block = document.createElement('div');
        block.className = 'check-dir';
        const head = document.createElement('p');
        head.className = 'check-dir-head';
        head.innerHTML = '<span class="check-dir-arrow">' + d.from + ' &rarr; ' + d.to + '</span>';
        block.appendChild(head);
        block.appendChild(makeField(nodeId, 'd' + i + '-checks',
          'The checks ' + d.from + ' has on ' + d.to, '',
          'List the formal checks ' + stripTags(d.from) + ' has on ' + stripTags(d.to) + '…'));
        block.appendChild(makeField(nodeId, 'd' + i + '-ex',
          'Real-life examples', 'add examples as you meet them in the course',
          'Add a real example…'));
        drawerBody.appendChild(block);
      });
    }

    drawer.hidden = false;
    drawerScrim.hidden = false;
    document.body.style.overflow = 'hidden';
    if (wasClosed) drawerClose.focus();
  }

  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    drawerScrim.hidden = true;
    currentNodeId = null;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function stripTags(s) { return (s || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim(); }

  drawerClose.addEventListener('click', closeDrawer);
  drawerScrim.addEventListener('click', closeDrawer);

  // delegate clicks on any node trigger
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-node]');
    if (trigger) { openNode(trigger.dataset.node); }
  });

  // ======================================================
  //  EXEMPLAR / CLEAR
  // ======================================================
  function loadExemplar() {
    Object.keys(NODE).forEach(id => {
      const node = NODE[id];
      fieldKeysFor(node).forEach(fk => {
        const ex = exemplarFor(node, fk);
        if (ex && ex.trim()) setNote(id, fk, decodeEntities(ex), 0);
      });
    });
    saveLocal();
    refreshDots();
    if (!drawer.hidden && currentNodeId) openNode(currentNodeId);
    toast('Model answer loaded — edit any box to make it yours');
  }

  function clearAll() {
    state.notes = {};
    saveLocal();
    refreshDots();
    if (!drawer.hidden && currentNodeId) openNode(currentNodeId);
    toast('Cleared');
  }

  // textareas hold plain text; our exemplars use a few HTML entities for nice glyphs.
  // Convert them to real characters for editing.
  const _entEl = document.createElement('textarea');
  function decodeEntities(s) { _entEl.innerHTML = s; return _entEl.value; }

  // ======================================================
  //  SAVE / LOAD FILE
  // ======================================================
  function saveFile() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'us-constitution-diagram.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Saved to your downloads');
  }

  const fileInput = document.getElementById('file-input');
  function openFile() { fileInput.click(); }
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (obj && obj.notes) {
          state = obj;
          saveLocal();
          refreshDots();
          if (!drawer.hidden) closeDrawer();
          toast('Diagram loaded from file');
        } else { toast('That file did not look like a saved diagram'); }
      } catch (err) { toast('Sorry — that file could not be read'); }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  // ======================================================
  //  SHARE LINK  (state travels inside the URL, no server)
  // ======================================================
  // Compact, URL-safe state encoding. Uses the browser's native gzip
  // (CompressionStream) when available so a full diagram shares as a short
  // link; falls back to plain base64 on older browsers. A one-char flag
  // ('c' = compressed, 'u' = uncompressed) tells the decoder which it is.
  function b64urlFromBytes(bytes) {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function bytesFromB64url(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  const enc = (s) => new TextEncoder().encode(s);
  const dec = (b) => new TextDecoder().decode(b);
  const canGzip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  async function pipeStream(stream, bytes) {
    const w = stream.writable.getWriter();
    w.write(bytes); w.close();
    const buf = await new Response(stream.readable).arrayBuffer();
    return new Uint8Array(buf);
  }
  async function encodeState(obj) {
    const json = JSON.stringify(obj);
    if (canGzip) {
      try { return 'c' + b64urlFromBytes(await pipeStream(new CompressionStream('gzip'), enc(json))); } catch (e) {}
    }
    return 'u' + b64urlFromBytes(enc(json));
  }
  async function decodeState(param) {
    const flag = param.charAt(0);
    const bytes = bytesFromB64url(param.slice(1));
    const json = (flag === 'c') ? dec(await pipeStream(new DecompressionStream('gzip'), bytes)) : dec(bytes);
    return JSON.parse(json);
  }

  const shareModal = document.getElementById('share-modal');
  const shareUrlInput = document.getElementById('share-url');
  const shareWarn = document.getElementById('share-warn');
  const shareCopy = document.getElementById('share-copy');

  async function openShare() {
    let payload;
    try { payload = await encodeState(state); } catch (e) { toast('Could not build a link'); return; }
    const base = location.href.split('#')[0];
    const url = base + '#d=' + payload;
    shareUrlInput.value = url;
    shareWarn.hidden = url.length < 12000;
    if (!shareWarn.hidden) {
      shareWarn.textContent = 'This is a long link because your diagram is very full. If it will not paste somewhere, use “Save file” instead and send the file.';
    }
    shareModal.hidden = false;
    shareUrlInput.focus();
    shareUrlInput.select();
  }
  shareCopy.addEventListener('click', () => {
    shareUrlInput.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrlInput.value).then(() => toast('Link copied')).catch(() => {});
      ok = true;
    }
    toast(ok ? 'Link copied' : 'Press Ctrl/Cmd + C to copy');
  });

  async function loadFromHash() {
    const m = location.hash.match(/[#&]d=([^&\s]+)/);
    if (!m) return false;
    try {
      const obj = await decodeState(m[1]);
      if (obj && obj.notes) {
        state = obj;
        // clean the hash so a refresh doesn't re-trigger, and save locally
        history.replaceState(null, '', location.pathname + location.search);
        saveLocal();
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ======================================================
  //  MODALS / TOAST
  // ======================================================
  function wireModalClose(modal) {
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => { modal.hidden = true; }));
  }
  wireModalClose(shareModal);
  const helpModal = document.getElementById('help-modal');
  wireModalClose(helpModal);

  const confirmModal = document.getElementById('confirm-modal');
  const confirmOk = document.getElementById('confirm-ok');
  const confirmCancel = document.getElementById('confirm-cancel');
  function askConfirm(onYes) {
    confirmModal.hidden = false;
    const yes = () => { cleanup(); confirmModal.hidden = true; onYes(); };
    const no = () => { cleanup(); confirmModal.hidden = true; };
    function cleanup() { confirmOk.removeEventListener('click', yes); confirmCancel.removeEventListener('click', no); }
    confirmOk.addEventListener('click', yes);
    confirmCancel.addEventListener('click', no);
  }

  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => { toastEl.hidden = true; }, 300);
    }, 2200);
  }

  // global Escape: close drawer / modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!shareModal.hidden) shareModal.hidden = true;
      else if (!helpModal.hidden) helpModal.hidden = true;
      else if (!confirmModal.hidden) confirmModal.hidden = true;
      else if (!drawer.hidden) closeDrawer();
    }
  });

  // ======================================================
  //  TOOLBAR WIRING
  // ======================================================
  document.getElementById('btn-exemplar').addEventListener('click', () => {
    if (Object.keys(state.notes).length) {
      askConfirmCustom('Load the model answer?',
        'This replaces what is currently in the boxes with the worked example. You can still edit any box afterwards.',
        'Load model answer', loadExemplar);
    } else { loadExemplar(); }
  });
  document.getElementById('btn-save').addEventListener('click', saveFile);
  document.getElementById('btn-open').addEventListener('click', openFile);
  document.getElementById('btn-share').addEventListener('click', openShare);
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (!Object.keys(state.notes).length) { toast('Nothing to clear yet'); return; }
    askConfirmCustom('Clear everything?', 'This removes all the notes you have added. This cannot be undone.', 'Clear all notes', clearAll);
  });
  document.getElementById('btn-help').addEventListener('click', () => { helpModal.hidden = false; });

  // a customisable confirm
  const confirmTitle = document.getElementById('confirm-title');
  const confirmText = document.getElementById('confirm-text');
  function askConfirmCustom(title, text, okLabel, onYes) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmOk.textContent = okLabel;
    askConfirm(onYes);
  }

  // ======================================================
  //  MODE SWITCH
  // ======================================================
  const modeExplore = document.getElementById('mode-explore');
  const modeTest = document.getElementById('mode-test');
  const viewExplore = document.getElementById('view-explore');
  const viewTest = document.getElementById('view-test');
  const toolbar = document.getElementById('toolbar');
  let quizBuilt = false;

  function setMode(mode) {
    const explore = mode === 'explore';
    modeExplore.classList.toggle('is-active', explore);
    modeTest.classList.toggle('is-active', !explore);
    modeExplore.setAttribute('aria-selected', explore ? 'true' : 'false');
    modeTest.setAttribute('aria-selected', !explore ? 'true' : 'false');
    viewExplore.hidden = !explore;
    viewTest.hidden = explore;
    toolbar.hidden = !explore;
    if (!explore) { closeDrawer(); if (!quizBuilt) { buildQuiz(); quizBuilt = true; } }
  }
  modeExplore.addEventListener('click', () => setMode('explore'));
  modeTest.addEventListener('click', () => setMode('test'));

  // ======================================================
  //  QUIZ  (Test yourself — genuine consequence)
  // ======================================================
  const QUIZ = [
    { type: 'mc', tag: 'Congress',
      q: 'How many members are there in the House of Representatives?',
      opts: ['435', '100', '538', '270'], correct: 0,
      fb: 'There are 435 Representatives, allocated by population. (The Senate has 100.)' },
    { type: 'mc', tag: 'Congress',
      q: 'How many Senators are there, and how are they allocated?',
      opts: ['100 — two per state', '435 — by population', '50 — one per state', '538 — by population'], correct: 0,
      fb: '100 Senators, two per state (geographic representation), as agreed in the Connecticut Compromise.' },
    { type: 'mc', tag: 'The Constitution',
      q: 'What was agreed in the Connecticut Compromise?',
      opts: ['Equal Senate representation, with the House by population', 'Abolishing the Electoral College', 'The two-term limit for Presidents', 'The Bill of Rights'], correct: 0,
      fb: 'Two Senators per state (to protect smaller states) and representation by population in the House.' },
    { type: 'mc', tag: 'Congress',
      q: 'How many votes are needed to end a filibuster in the Senate?',
      opts: ['60', '51', '67', '50'], correct: 0,
      fb: 'Sixty votes — this passes a “cloture” motion to end debate.' },
    { type: 'mc', tag: 'Checks & balances',
      q: 'How can the President block a bill that Congress has passed?',
      opts: ['Use the veto', 'Use the filibuster', 'Issue a pardon', 'Call a special session'], correct: 0,
      fb: 'The veto. Congress can override it only with a two-thirds vote in both houses.' },
    { type: 'mc', tag: 'Checks & balances',
      q: 'Which of these is a check by Congress on the President?',
      opts: ['Impeach and remove the President', 'Declare a law unconstitutional', 'Grant a pardon', 'Negotiate a treaty'], correct: 0,
      fb: 'Congress can impeach and remove the President, override vetoes, control funding and confirm/reject appointments.' },
    { type: 'mc', tag: 'Checks & balances',
      q: 'Which branch can declare an Act of Congress unconstitutional?',
      opts: ['The judicial branch', 'The executive branch', 'The legislative branch', 'The states'], correct: 0,
      fb: 'The judiciary, through judicial review — the Supreme Court’s key check on the other branches.' },
    { type: 'mc', tag: 'Checks & balances',
      q: 'How many times was Donald Trump impeached by the House, and was he removed?',
      opts: ['Twice; acquitted both times', 'Once; removed from office', 'Three times; acquitted', 'Twice; removed from office'], correct: 0,
      fb: 'Impeached in 2019 and 2021. A two-thirds Senate vote is needed to convict, which was not reached, so he was acquitted both times.' },
    { type: 'mc', tag: 'Elections',
      q: 'Why did Hillary Clinton not become President after the 2016 election?',
      opts: ['She lost in the Electoral College despite the popular vote', 'She withdrew from the race', 'She lost her party’s nomination', 'Congress blocked her'], correct: 0,
      fb: 'The President is chosen by the Electoral College (270 needed), not the national popular vote.' },
    { type: 'mc', tag: 'In practice',
      q: 'What is a “divided government”?',
      opts: ['One party holds the presidency while another controls Congress', 'The Supreme Court is evenly split', 'Two Presidents serve at the same time', 'Three parties share the House'], correct: 0,
      fb: 'One party controls the presidency while another controls Congress — a recipe for gridlock.' },
    { type: 'mc', tag: 'In practice',
      q: 'What term describes the increasing ideological distance between the two parties?',
      opts: ['Polarisation', 'Bipartisanship', 'Gridlock', 'Federalism'], correct: 0,
      fb: 'Polarisation — the parties move towards their “poles”, leaving little middle ground.' },
    { type: 'mc', tag: 'The Constitution',
      q: 'How is a formal amendment to the Constitution passed?',
      opts: ['Two-thirds of both houses, then three-quarters of the states', 'A simple majority in Congress', 'A Supreme Court ruling', 'A presidential executive order'], correct: 0,
      fb: 'A two-thirds majority in both houses of Congress, then ratification by three-quarters of state legislatures. Only 27 have ever passed.' },
    { type: 'text', tag: 'Congress',
      q: 'Name the Speaker of the House of Representatives (119th Congress).',
      accept: ['johnson', 'mike johnson'], answer: 'Mike Johnson (R)',
      fb: 'Mike Johnson (R), re-elected Speaker at the start of the 119th Congress.' },
    { type: 'text', tag: 'Congress',
      q: 'Name the Senate Majority Leader (119th Congress).',
      accept: ['thune', 'john thune'], answer: 'John Thune (R)',
      fb: 'John Thune (R) is the Senate Majority Leader — the most powerful person in the Senate.' }
  ];

  const quizWrap = document.getElementById('quiz');
  let qOrder = [];
  let qIndex = 0;
  let qScore = 0;
  let qMissed = [];
  let qAnswered = false;

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function buildQuiz() {
    qOrder = shuffle(QUIZ.map((_, i) => i));
    qIndex = 0; qScore = 0; qMissed = []; qAnswered = false;
    renderQuestion();
  }

  function renderQuestion() {
    qAnswered = false;
    const q = QUIZ[qOrder[qIndex]];
    const total = qOrder.length;
    const pct = Math.round((qIndex / total) * 100);

    const card = document.createElement('div');
    card.className = 'quiz-card';

    let optionsHTML = '';
    let order = [];
    if (q.type === 'mc') {
      order = shuffle(q.opts.map((_, i) => i));
      optionsHTML = '<div class="quiz-options" id="q-opts">' +
        order.map((oi, pos) => '<button class="quiz-opt" type="button" data-oi="' + oi + '">' + escapeHTML(q.opts[oi]) + '</button>').join('') +
        '</div>';
    } else {
      optionsHTML = '<div class="quiz-input-row"><input class="quiz-input" id="q-input" type="text" autocomplete="off" placeholder="Type your answer…" aria-label="Your answer" /><button class="primary-btn" id="q-submit" type="button">Check</button></div>';
    }

    card.innerHTML =
      '<div class="quiz-progress"><span>Question ' + (qIndex + 1) + ' of ' + total + '</span>' +
      '<span class="quiz-bar"><span class="quiz-bar-fill" style="width:' + pct + '%"></span></span>' +
      '<span>Score ' + qScore + '</span></div>' +
      '<p class="quiz-tag">' + q.tag + '</p>' +
      '<p class="quiz-q">' + escapeHTML(q.q) + '</p>' +
      optionsHTML +
      '<div class="quiz-feedback" id="q-fb"></div>' +
      '<div class="quiz-actions" id="q-actions"></div>';

    quizWrap.innerHTML = '';
    quizWrap.appendChild(card);

    if (q.type === 'mc') {
      card.querySelectorAll('.quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => answerMC(q, +btn.dataset.oi, card));
      });
    } else {
      const input = card.querySelector('#q-input');
      const submit = card.querySelector('#q-submit');
      const go = () => answerText(q, input.value, card);
      submit.addEventListener('click', go);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      input.focus();
    }
  }

  function answerMC(q, oi, card) {
    if (qAnswered) return;
    qAnswered = true;
    const correct = oi === q.correct;
    const opts = card.querySelectorAll('.quiz-opt');
    opts.forEach(b => {
      b.disabled = true;
      const bi = +b.dataset.oi;
      if (bi === q.correct) { b.classList.add('correct'); b.innerHTML += '<span class="opt-mark">✓</span>'; }
      else if (bi === oi) { b.classList.add('wrong'); b.innerHTML += '<span class="opt-mark">✗</span>'; }
    });
    finishQuestion(q, correct, card);
  }

  function answerText(q, val, card) {
    if (qAnswered) return;
    const norm = (val || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    if (norm === '') { card.querySelector('#q-input').focus(); return; }
    qAnswered = true;
    const correct = q.accept.some(a => norm.indexOf(a) !== -1);
    const input = card.querySelector('#q-input');
    const submit = card.querySelector('#q-submit');
    input.disabled = true; submit.disabled = true;
    input.style.borderColor = correct ? 'var(--jud)' : 'var(--leg)';
    finishQuestion(q, correct, card);
  }

  function finishQuestion(q, correct, card) {
    if (correct) {
      qScore++;
      const sc = card.querySelector('.quiz-progress span:last-child');
      if (sc) sc.textContent = 'Score ' + qScore;
    } else {
      qMissed.push({ q: q.q, a: q.answer || q.opts[q.correct] });
    }

    const fb = card.querySelector('#q-fb');
    fb.classList.add('show', correct ? 'is-right' : 'is-wrong');
    fb.innerHTML = '<span class="fb-head">' + (correct ? 'Correct' : 'Not quite') + '</span>' +
      (correct ? '' : '<strong>Answer: ' + escapeHTML(q.answer || q.opts[q.correct]) + '</strong>. ') +
      escapeHTML(q.fb);

    const actions = card.querySelector('#q-actions');
    const btn = document.createElement('button');
    btn.className = 'primary-btn';
    btn.type = 'button';
    btn.textContent = (qIndex + 1 < qOrder.length) ? 'Next question' : 'See your score';
    btn.addEventListener('click', () => {
      qIndex++;
      if (qIndex < qOrder.length) renderQuestion();
      else renderEnd();
    });
    actions.appendChild(btn);
    btn.focus();
  }

  function renderEnd() {
    const total = qOrder.length;
    const pct = Math.round((qScore / total) * 100);
    let msg;
    if (pct === 100) msg = 'Outstanding — full marks. You know the essentials cold.';
    else if (pct >= 75) msg = 'Strong work. A quick look back at the missed ones will tidy these up.';
    else if (pct >= 50) msg = 'A solid start. Revisit the boxes below in the diagram, then try again.';
    else msg = 'Worth another look. Explore the diagram, then come back and beat your score.';

    let reviewHTML = '';
    if (qMissed.length) {
      reviewHTML = '<div class="quiz-review"><h3>Worth another look</h3>' +
        qMissed.map(m => '<div class="quiz-review-item"><div class="qr-q">' + escapeHTML(m.q) + '</div><div class="qr-a">' + escapeHTML(m.a) + '</div></div>').join('') +
        '</div>';
    }

    const card = document.createElement('div');
    card.className = 'quiz-card quiz-end';
    card.innerHTML =
      '<div class="quiz-score-ring">' + qScore + ' / ' + total + '</div>' +
      '<h2>' + pct + '%</h2>' +
      '<p>' + msg + '</p>' +
      reviewHTML +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px">' +
      '<button class="primary-btn" id="q-again" type="button">Try again</button>' +
      '<button class="tool-btn tool-btn--ghost" id="q-back" type="button">Back to the diagram</button>' +
      '</div>';
    quizWrap.innerHTML = '';
    quizWrap.appendChild(card);
    card.querySelector('#q-again').addEventListener('click', buildQuiz);
    card.querySelector('#q-back').addEventListener('click', () => setMode('explore'));
  }

  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ======================================================
  //  INIT
  // ======================================================
  async function init() {
    renderPrinciples();
    let fromShare = false;
    try { fromShare = await loadFromHash(); } catch (e) {}
    if (!fromShare) loadLocal();
    refreshDots();
    markSaved(true);
    if (fromShare) toast('Opened a shared diagram');
  }
  init();

})();
