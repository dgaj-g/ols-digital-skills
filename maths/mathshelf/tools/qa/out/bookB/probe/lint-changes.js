const fs=require("fs");let s=fs.readFileSync("dev/lint-content-stats.js","utf8");
const a="  (q.claims || []).forEach(function (c, i) {\n    if (!c.options || c.options.indexOf('Not enough information') === -1) return;\n    if (!c.proof || TFN_PROOF_KINDS.indexOf(c.proof.kind) === -1) {";
if(!s.includes(a)) throw new Error("miss");
s=s.replace(a,`  (q.claims || []).forEach(function (c, i) {
    if (!c.options || c.options.indexOf('Not enough information') === -1) {
      /* A CHANGE CLAIM IS PROVED TOO (orchestrator, 13 Sept 2026): "…the mean
         will… Change / Stay the same" (or Increase / Decrease / Stay the same)
         with a \`changes\` proof is re-derived from its before/after lists; the
         authored verdict must agree in kind (same vs changed, and the direction
         when the options name one). */
      if (c.options && c.proof && c.proof.kind === 'changes') {
        var v = evalJudgeProof(c.proof, q);
        if (v !== undefined) {
          var authoredSame = /stay|same/i.test(String(c.verdict)), computedSame = v === 'Stay the same';
          if (authoredSame !== computedSame)
            fail(book, secId, q.id, 'judge', 'claim ' + (i + 1) + ': proof (changes) gives "' + v + '" but authored verdict is "' + c.verdict + '"');
          else if (!computedSame && /increase|decrease/i.test(String(c.verdict)) && String(c.verdict).toLowerCase() !== v.toLowerCase())
            fail(book, secId, q.id, 'judge', 'claim ' + (i + 1) + ': proof (changes) gives "' + v + '" but authored verdict is "' + c.verdict + '"');
        }
      }
      return;
    }
    if (!c.proof || TFN_PROOF_KINDS.indexOf(c.proof.kind) === -1) {`);
fs.writeFileSync("dev/lint-content-stats.js",s);
