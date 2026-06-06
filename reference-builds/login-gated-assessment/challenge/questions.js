/* ============================================================
   SAMPLE question bank for the reference engine — GENERIC & THROWAWAY.
   Three illustrative questions so the engine is runnable and the
   question schema + a few visual types are demonstrated. Replace
   wholesale with the real activity's questions.

   The REAL competition's questions/answer key are NOT in this public
   repo on purpose (a public answer key lets pupils cheat). Author the
   real bank elsewhere; only the engine lives here.

   Schema per question:
     id, band (easy|medium|hard|expert), points, skill, theme, title,
     scenario, prompt, visual ({type,data} or null), options[4],
     correctIndex (0-3), explanation
   Visual types the renderer supports: iconRow, iconGrid, table, graph,
   sequence, tree, gridRoute, pixelGrid (see script.js renderVisual()).
   ============================================================ */
window.GG_QUESTIONS = [
  {
    id: 's1', band: 'easy', points: 5, skill: 'Pattern Recognition', theme: 'Sample',
    title: 'Shape Sequence',
    scenario: 'A pattern of shapes repeats in a fixed order along a strip.',
    prompt: 'Which shape comes next?',
    visual: { type: 'iconRow', data: { caption: 'The pattern so far', items: [
      { icon: '🔺' }, { icon: '⬛' }, { icon: '⭐' }, { icon: '🔺' }, { icon: '⬛' }, { icon: '⭐' }, { icon: '🔺' }, { icon: '?' }
    ] } },
    options: ['⬛ square', '⭐ star', '🔺 triangle', '⚫ circle'],
    correctIndex: 0,
    explanation: 'The unit "triangle, square, star" repeats; after a triangle comes the square. (Pattern recognition — spotting the repeating block.)'
  },
  {
    id: 's2', band: 'medium', points: 10, skill: 'Data Interpretation', theme: 'Sample',
    title: 'Library Returns',
    scenario: 'A small table shows how many books four pupils borrowed and how many they have returned.',
    prompt: 'Who still has the most books out on loan?',
    visual: { type: 'table', data: {
      headers: ['Pupil', 'Borrowed', 'Returned'],
      rows: [['Ava', '7', '5'], ['Ben', '9', '9'], ['Cara', '8', '3'], ['Dan', '6', '2']],
      caption: 'Books out on loan = Borrowed − Returned'
    } },
    options: ['Ava (2)', 'Cara (5)', 'Dan (4)', 'Ben (0)'],
    correctIndex: 1,
    explanation: 'Out on loan = Borrowed − Returned: Ava 2, Ben 0, Cara 5, Dan 4. Cara has the most (5). (Data interpretation — combining two columns.)'
  },
  {
    id: 's3', band: 'hard', points: 15, skill: 'Network Thinking', theme: 'Sample',
    title: 'Shortest Route',
    scenario: 'A delivery robot can only travel along the marked paths, each labelled with its time in minutes.',
    prompt: 'What is the smallest total time from Start to End?',
    visual: { type: 'graph', data: { directed: false,
      nodes: [{ id: 'S', label: 'Start', x: 8, y: 50 }, { id: 'A', label: 'A', x: 40, y: 18 }, { id: 'B', label: 'B', x: 40, y: 82 }, { id: 'C', label: 'C', x: 72, y: 50 }, { id: 'E', label: 'End', x: 94, y: 50 }],
      edges: [{ from: 'S', to: 'A', weight: 4 }, { from: 'S', to: 'B', weight: 2 }, { from: 'A', to: 'C', weight: 3 }, { from: 'B', to: 'C', weight: 6 }, { from: 'C', to: 'E', weight: 2 }],
      caption: 'Numbers are minutes for each path' } },
    options: ['9 minutes', '10 minutes', '8 minutes', '12 minutes'],
    correctIndex: 0,
    explanation: 'S→A→C→End = 4+3+2 = 9; S→B→C→End = 2+6+2 = 10. The shortest is 9. (Weighted shortest path.)'
  }
];
