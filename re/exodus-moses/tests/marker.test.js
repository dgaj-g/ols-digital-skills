/* Gate: node tests/marker.test.js  (exit 1 on any failure)
   Every line is a control. The "must score 0" lines are the ones that must FAIL to earn a mark. */
var M = require('../marker.js');
var fails = 0, runs = 0;
function eq(label, got, want) { runs++; if (got !== want) { fails++; console.log('FAIL  ' + label + '  got ' + got + ' want ' + want); } }

/* ---- Question C: markWhy -> 0 / 1 / 2 ---- */
var why2 = [
  "To protect him from Pharaoh's order to kill Hebrew baby boys.",
  "So he would be safe from being killed.",
  "To hide him from the Egyptian soldiers.",
  "she hid him so the king of egypt wouldnt kill him",
  "to keep him safe because pharaoh said all hebrew boys must die",
  "So that he would not be killed by the Egyptians.",
  "Because Pharaoh ordered every Hebrew baby boy to be thrown in the river and she wanted to save him.",
  "to protect him from the soldiers",
  "so he wouldn't die"
];
var why1 = [
  "To protect him.", "So he would be safe.", "To hide him.", "to keep him safe", "so he would survive",
  "Because Pharaoh wanted to kill the babies.",           /* danger named, intent not stated */
  "The soldiers were killing the Hebrew boys.",
  "to save him from the river"
];
var why0 = [
  "", "   ", "idk", "I don't know", "because she wanted to", "so he could swim", "Moses was a baby",
  "she was sad", "because the river was nice", "to give him a bath", "she loved him"
];
why2.forEach(function (s) { eq('why=2: ' + JSON.stringify(s), M.markWhy(s).score, 2); });
why1.forEach(function (s) { eq('why=1: ' + JSON.stringify(s), M.markWhy(s).score, 1); });
why0.forEach(function (s) { eq('why=0: ' + JSON.stringify(s), M.markWhy(s).score, 0); });
/* the two 1-mark feedback lines need the flags */
eq('intentOnly flag', M.markWhy("To protect him.").intent && !M.markWhy("To protect him.").threat, true);
eq('threatOnly flag', !M.markWhy("Because Pharaoh wanted to kill the babies.").intent && M.markWhy("Because Pharaoh wanted to kill the babies.").threat, true);

/* ---- Question F (i): markPlagueCount -> 0 / 1 ---- */
["10", "ten", "Ten plagues", "10 plagues", "there were 10", "about ten", "10.", "TEN", "the 10th"].forEach(function (s) {
  eq('count=1: ' + JSON.stringify(s), M.markPlagueCount(s).score, 1);
});
["", "9", "12", "seven", "lots", "9 or 10", "ten or eleven", "many", "100", "1 0"].forEach(function (s) {
  eq('count=0: ' + JSON.stringify(s), M.markPlagueCount(s).score, 0);
});

/* ---- Question F (ii): markFinalPlague -> 0 / 1 ---- */
["Angel of death", "the angel of death", "angle of death", "death angel", "the angel", "Death of the firstborn",
 "death of the first born", "the first-born sons died", "killing of the firstborn", "the eldest sons were killed",
 "Plague of the firstborn", "every first born son in egypt died", "the oldest son of every family died"].forEach(function (s) {
  eq('final=1: ' + JSON.stringify(s), M.markFinalPlague(s).score, 1);
});
["", "frogs", "locusts", "darkness", "blood", "boils", "hail", "flies", "gnats", "lice", "death of livestock",
 "the cattle died", "passover", "the last plague", "moses", "death", "the river turned to blood", "angela"].forEach(function (s) {
  eq('final=0: ' + JSON.stringify(s), M.markFinalPlague(s).score, 0);
});

console.log(runs + ' checks, ' + fails + ' failures');
process.exit(fails ? 1 : 0);
