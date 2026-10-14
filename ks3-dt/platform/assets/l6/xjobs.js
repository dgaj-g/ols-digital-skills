/* THE OPERATION · a screen's way on. On a lesson card it is "Continue". Opened as an extra job (the hash
   carries extras: {back, finish}) it is the two buttons every extra-jobs screen has (DFM 265c): back to the
   list of jobs, and the lesson's own finish label, both live from the first frame. */
window.OPCONT = function (btn, post) {
  var H = window.OPHASH || {}, X = H.extras;
  btn.hidden = false;
  btn.textContent = X ? X.back : 'Continue';
  btn.onclick = function () { post('next'); };
  if (!X || btn.nextElementSibling && btn.nextElementSibling.classList.contains('xfinish')) return;
  var f = document.createElement('button');
  f.type = 'button'; f.className = 'btn ghost xfinish'; f.textContent = X.finish;
  f.onclick = function () { post('xfinish'); };
  btn.insertAdjacentElement('afterend', f);
};
