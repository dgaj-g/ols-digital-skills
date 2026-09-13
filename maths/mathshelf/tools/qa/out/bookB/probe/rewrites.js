const fs=require("fs");
for (const f of ["content-stats-averages.js","tools/qa/out/bookB/content-stats-averages.js"]) {
  let s=fs.readFileSync(f,"utf8");
  function rep(a,b,all){ if(!s.includes(a)) throw new Error(f+" miss: "+a.slice(0,60)); s = all ? s.split(a).join(b) : s.replace(a,b); }
  // q25 — sentence endings, options completing "will…"
  rep("{ text: 'The range of the weights', options: ['Changes', 'Stays the same'], verdict: 'Stays the same',", "{ text: 'When 4.6 kg is corrected to 4.5 kg, the range of the weights will…', options: ['Change', 'Stay the same'], verdict: 'Stay the same',");
  rep("{ text: 'The median weight', options: ['Changes', 'Stays the same'], verdict: 'Stays the same',", "{ text: 'After the correction, the median weight will…', options: ['Change', 'Stay the same'], verdict: 'Stay the same',");
  rep("{ text: 'The mean weight', options: ['Changes', 'Stays the same'], verdict: 'Changes',", "{ text: 'With 4.5 kg in place of 4.6 kg, the mean weight will…', options: ['Change', 'Stay the same'], verdict: 'Change',");
  rep("{ text: 'The modal weight', options: ['Changes', 'Stays the same'], verdict: 'Stays the same',", "{ text: 'Once the weight is corrected, the modal weight will…', options: ['Change', 'Stay the same'], verdict: 'Stay the same',");
  // q26
  rep("{ text: 'The range', options: ['Changes', 'Stays the same'], verdict: 'Stays the same',", "{ text: 'After the table is amended, the range will…', options: ['Change', 'Stay the same'], verdict: 'Stay the same',");
  rep("{ text: 'The mean', options: ['Changes', 'Stays the same'], verdict: 'Changes',", "{ text: 'After the table is amended, the mean will…', options: ['Change', 'Stay the same'], verdict: 'Change',");
  rep("{ text: 'The class interval containing the median', options:", "{ text: 'After the table is amended, the class containing the median will be…', options:");
  // q20/q21/q22 — one word for a class
  rep("Estimate the mean number of words per sentence, and find the modal group and the group containing the median.", "Estimate the mean number of words per sentence, and find the modal class and the class containing the median.");
  rep("Estimate the mean mark, and find the modal group and the group containing the median.", "Estimate the mean mark, and find the modal class and the class containing the median.");
  rep("Estimate the mean pocket money, and find the class interval containing the median.", "Estimate the mean pocket money, and find the class containing the median.");
  rep("label: 'Modal group'", "label: 'Modal class'", true);
  rep("label: 'Median group'", "label: 'Class containing the median'", true);
  rep("label: 'Class interval containing the median'", "label: 'Class containing the median'", true);
  // s5 film step 6
  rep("{ say: 'Claim: \"The estimated mean = 1855 ÷ 20.\" That is exactly the method — true.',", "{ say: 'Claim: \"The estimated mean = 1855 ÷ 20.\" Dividing 1855 by 20 is exactly the method — the claim is true.',");
  fs.writeFileSync(f,s);
}
let j=fs.readFileSync("jotter.js","utf8");
const a="perfect: ['Every column multiplied and totalled, and the answers read from your own table.', 'Frequency times value, row by row, then the totals.', 'You built the table and read the averages off it.'],";
if(!j.includes(a)) throw new Error("jotter miss");
j=j.replace(a,"perfect: ['Every column multiplied and totalled, and the answers read from your own table.', 'You multiplied frequency by value, row by row, then added up the totals.', 'You built the table and read the averages off it.'],");
fs.writeFileSync("jotter.js",j);
