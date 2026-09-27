/* platform/editor.js — the SQL editor (SPEC 4, his ruling on SSMS colours). A transparent textarea over a coloured <pre>,
 * with a line-number gutter and the current line tinted while focused. Colours as SQL Server Management Studio:
 * keywords #0000FF, built-in functions #FF00FF, strings #FF0000, comments #008000, operators #808080, names and numbers #000000.
 * Enter keeps the indent; Tab inserts 4 spaces. 6 lines tall, grows to 20, then scrolls; long lines scroll sideways (no wrap).
 * window.SqlEditor.create(host, {value, readOnly, placeholder, label, onChange}) -> {get, set, focus, el}
 * window.SqlEditor.html(sql) -> coloured HTML. */
(function () {
  'use strict';
  const KEYWORDS = new Set(('select from where and or not in is null as on join inner left right full outer cross group by having order asc desc distinct top ' +
    'insert into values update set delete create table alter add drop column primary key foreign references constraint unique check default identity ' +
    'int integer smallint bigint varchar nvarchar char nchar date datetime time decimal numeric float money bit text between like exists case when then else end ' +
    'union all go with begin declare').split(' '));
  const FUNCS = new Set(('count sum avg min max getdate dateadd datediff datepart year month day cast convert len upper lower round isnull coalesce substring ' +
    'replace concat abs floor ceiling sysdatetime datename current_timestamp').split(' '));
  const BARE = new Set(['getdate', 'current_timestamp', 'sysdatetime']);
  const LINE = 22.5, MIN = 6, MAX = 20;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function html(src) {
    let out = '', i = 0;
    const s = src || '';
    while (i < s.length) {
      const ch = s[i];
      if (ch === '-' && s[i + 1] === '-') { let j = s.indexOf('\n', i); if (j < 0) j = s.length; out += '<span class="c">' + esc(s.slice(i, j)) + '</span>'; i = j; continue; }
      if (ch === '/' && s[i + 1] === '*') { let j = s.indexOf('*/', i + 2); j = j < 0 ? s.length : j + 2; out += '<span class="c">' + esc(s.slice(i, j)) + '</span>'; i = j; continue; }
      if (ch === "'") {
        let j = i + 1;
        while (j < s.length) { if (s[j] === "'" && s[j + 1] === "'") { j += 2; continue; } if (s[j] === "'") { j++; break; } j++; }
        out += '<span class="s">' + esc(s.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (ch === '[') { let j = s.indexOf(']', i); j = j < 0 ? s.length : j + 1; out += '<span class="n">' + esc(s.slice(i, j)) + '</span>'; i = j; continue; }
      if (/[A-Za-z_@#]/.test(ch)) {
        let j = i + 1;
        while (j < s.length && /[\w$]/.test(s[j])) j++;
        const w = s.slice(i, j), lw = w.toLowerCase();
        let cls = 'n';
        if (FUNCS.has(lw) && (/^\s*\(/.test(s.slice(j)) || BARE.has(lw))) cls = 'f';
        else if (KEYWORDS.has(lw)) cls = 'k';
        out += '<span class="' + cls + '">' + esc(w) + '</span>'; i = j; continue;
      }
      if (/[0-9]/.test(ch)) { let j = i + 1; while (j < s.length && /[\d.]/.test(s[j])) j++; out += '<span class="n">' + esc(s.slice(i, j)) + '</span>'; i = j; continue; }
      if (/[=<>!+\-*\/%]/.test(ch)) { out += '<span class="o">' + esc(ch) + '</span>'; i++; continue; }
      out += esc(ch); i++;
    }
    return out + '\n';
  }

  function create(host, opts) {
    opts = opts || {};
    host.classList.add('ed');
    host.innerHTML = '<div class="ed-g"><div class="ed-gi"></div></div><div class="ed-c"><div class="ed-cur"></div><pre></pre></div>';
    const gi = host.querySelector('.ed-gi'), wrap = host.querySelector('.ed-c'), pre = wrap.querySelector('pre'), cur = wrap.querySelector('.ed-cur');
    const gutter = (n) => { let t = ''; for (let k = 1; k <= n; k++) t += k + '\n'; gi.textContent = t; };
    if (opts.readOnly) {
      host.classList.add('ro');
      let val = opts.value || '';
      const show = () => { pre.innerHTML = html(val); gutter(Math.max(1, val.split('\n').length)); };
      show();
      if (opts.label) host.setAttribute('aria-label', opts.label);
      return { el: host, get: () => val, set: (v) => { val = v || ''; show(); }, focus: () => {} };
    }
    const ta = document.createElement('textarea');
    ta.spellcheck = false; ta.wrap = 'off'; ta.placeholder = opts.placeholder || '';
    ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocomplete', 'off'); ta.setAttribute('autocorrect', 'off');
    if (opts.label) ta.setAttribute('aria-label', opts.label);
    wrap.appendChild(ta);
    let lines = 0;
    function size() {
      const n = Math.max(1, ta.value.split('\n').length);
      const rows = Math.min(MAX, Math.max(MIN, n));
      ta.style.height = (rows * LINE + 20) + 'px';
      if (n !== lines) { lines = n; gutter(Math.max(n, rows)); }
    }
    function follow() {
      pre.style.transform = 'translate(' + (-ta.scrollLeft) + 'px,' + (-ta.scrollTop) + 'px)';
      gi.style.transform = 'translateY(' + (-ta.scrollTop) + 'px)';
      const row = ta.value.slice(0, ta.selectionStart).split('\n').length - 1;
      cur.style.top = (10 + row * LINE - ta.scrollTop) + 'px';
    }
    function paint(silent) { pre.innerHTML = html(ta.value); size(); follow(); if (!silent && opts.onChange) opts.onChange(ta.value); }
    function put(text) {
      const a = ta.selectionStart, b = ta.selectionEnd;
      ta.setRangeText(text, a, b, 'end');
      paint();
    }
    ta.addEventListener('input', () => paint());
    ta.addEventListener('scroll', follow);
    ['keyup', 'click', 'focus', 'select'].forEach((ev) => ta.addEventListener(ev, follow));
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); put('    '); return; }
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
        const a = ta.selectionStart, start = ta.value.lastIndexOf('\n', a - 1) + 1, indent = /^[ \t]*/.exec(ta.value.slice(start, a))[0];
        e.preventDefault(); put('\n' + indent);
      }
    });
    ta.value = opts.value || '';
    paint(true);
    return { el: host, get: () => ta.value, set: (v) => { ta.value = v || ''; paint(); }, focus: () => ta.focus() };
  }
  window.SqlEditor = { create, html };
})();
