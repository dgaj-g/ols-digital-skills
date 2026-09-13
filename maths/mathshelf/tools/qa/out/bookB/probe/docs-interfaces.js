const fs=require("fs");let s=fs.readFileSync("INTERFACES.md","utf8");
function rep(a,b){ if(!s.includes(a)) throw new Error("miss: "+a.slice(0,50)); s=s.replace(a,b); }
rep("  (dx `SC_CORR_SIGN`) · `OUTLIER` accuracy w1, exact index into `given.concat(toPlot)`.\n",
`  (dx \`SC_CORR_SIGN\`) · \`OUTLIER\` accuracy w1, exact index into \`given.concat(toPlot)\`.

### Units per kind (Book B: table; values additions) — 13 Sept 2026
- \`table\` — in table order then ask order: \`C_<col>_<i>\` per derived cell (method w1, **ftEarns**:
  ok:1 exact; ok:2 iff consistent with HER inputs in that row — fx = f × her mid, cf = her previous cf + f;
  dx \`AV_NO_MIDPOINT\` when a mid cell equals the class bound) · \`T_<col>\` per total (method w1,
  **ftEarns**: ok:2 iff the sum of her own column) · value asks \`A_<id>\` (accuracy w1; ok:1 exact or
  within the \`dp\` rounding; ok:2 iff \`ft\` \`sum(fx)/sum(f)\` reproduces it from her table; dx
  \`AV_DIV_ROWS\`, \`AV_FX_NOT_SUMMED\`) · row asks \`A_<id>\` (accuracy w1, exact 0-based index; dx
  \`AV_MEDIAN_CLASS_OFF\` one row off on a median-named ask). \`GJ_STATS.tableDerive(q)\` is the truth
  (\`derive:'f*x'\` uses \`mid\` when present else \`x\`; \`'mid'\` = (lo+hi)/2; \`'cum'\` the running total;
  \`medianRow\` = the first row whose cumulative frequency reaches (n+1)/2). Tally \`['Table', 'Answers']\`.
- \`values\` additions — a slot may carry \`stat\` (mean/median/mode/range/missing/total/newMean) and the
  question \`fig:{type:'list', values}\`; when a stat slot is wrong and the pack authored no \`dx\`, the
  engine detects \`AV_MEDIAN_UNORDERED\`, \`AV_MODE_AS_FREQ\`, \`AV_RANGE_NOT_DIFF\`, \`AV_DIV_ROWS\`,
  \`RM_AVERAGED_MEANS\`, \`RM_WRONG_N\` from the printed list / the ft chain (\`dx:false\` waives a slot the
  lint proves indistinguishable). A slot with \`set:n\` (or \`answer.constraints.n\`) is a set of n boxes read
  from \`S.v[id+'_set']\`; \`constraintsHold\` marks n/mean/median/mode/range. \`rm.newMean\` takes \`xFrom\` to
  chain through a second total. \`fig:{type:'table', cols}\` prints a given table above the boxes.
`);
rep("scatter  {pts:[[x,y]…], line:[[x1,y1],[x2,y2]], est:'70', corr:'positive', outlier:6}\n                                                    only the keys the question's `asks` name exist (pts always)\n",
"scatter  {pts:[[x,y]…], line:[[x1,y1],[x2,y2]], est:'70', corr:'positive', outlier:6}\n                                                    only the keys the question's `asks` name exist (pts always)\ntable    {cells:{fx:['23','96',…], mid:[…]}, totals:{f:'20', fx:'503'}, asks:{mean:'25.15', modal:2}}\n                                                    cells/totals hold strings ('' = blank); a row ask holds a 0-based index or null\n");
rep("- `KINDS` — all thirteen kind ids: the eight pre-Book-A kinds (`qlist cftable cfplot cfread boxplot\n  compare judge values`) plus Book A's five (`order pick stemleaf pie scatter`).",
"- `KINDS` — all fourteen kind ids: the eight pre-Book-A kinds (`qlist cftable cfplot cfread boxplot\n  compare judge values`), Book A's five (`order pick stemleaf pie scatter`) and Book B's `table`\n  (DOM: `.stat-tablekind` › `table.stat-table.stat-table-edit` with `button.stat-cell[data-col][data-row]`\n  (`data-row=\"total\"` for a total), value asks `.stat-slots .stat-cell[aria-label]`, row asks\n  `button.stat-rowpick[data-ask][data-row][aria-pressed]`; stages `empty filling asking ready`). A judge\n  question's `fig:{type:'list'}` / `data:{cols}` and a values question's `fig:{type:'table'}` are drawn\n  read-only above the board (`givenTable`).");
fs.writeFileSync("INTERFACES.md",s);
