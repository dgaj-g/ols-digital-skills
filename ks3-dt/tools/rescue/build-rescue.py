#!/usr/bin/env python3
"""J3 Lesson 4 "The Rescue": builds the story's pages from chapter 1's frozen page (K55).

  platform/assets/rescue/hour.html   the page the `rescue` engine shows (shipped)
  probes/rescue/hour.html            the same page for the gates: test options read from its own address
  probes/rescue/art-test.html        chapter 1 alone, for the frame hashes (spec section 16)

Chapter 1's page (tools/rescue/chapter1.html, a byte copy of the prototype's rescue-art-test.html) is
copied as it is. Three things are added: the hour's stylesheet, the hour's own elements, the hour's
scripts. The prototype's jump menu is not part of the lesson and is not added.
The story's files live in platform/assets/rescue/rescue/. Chapter 1's four files (chars, scene, sound,
film) are never edited: their hashes are in tools/rescue/chapter1-files.sha1 and the gates check them.

  python3 ks3-dt/tools/rescue/build-rescue.py
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
KS3 = os.path.normpath(os.path.join(HERE, '..', '..'))
src = open(os.path.join(HERE, 'chapter1.html'), encoding='utf-8').read()

SCRIPTS_BEFORE = ['hour-bridge.js', 'hour-keys.js']
SCRIPTS_AFTER = ['hog.js', 'perf.js', 'hour-scenes.js', 'hour-sound.js', 'hour-judge.js', 'hour.js',
                 'hour-river.js', 'hour-lane.js', 'hour-door.js']

DOM = '''
<!-- ===== the whole hour: everything below is added by tools/rescue/build-rescue.py; chapter 1 above is unchanged ===== -->
<div id="hstrip"><span>1 The branch</span><span>2 The river</span><span>3 The lane</span><span>4 The door</span></div>
<div id="hcap"></div>
<div id="hsay"><span class="who">BLINK</span><span id="hsayt"></span></div>
<div id="hfn"><div class="k" id="hfnk">YOUR FUNCTION</div><div id="hfnl" class="hcode"></div><p id="hfnnote"></p></div>
<div id="hcard">
  <p class="k" id="hk"></p>
  <h2 id="hh"></h2>
  <ol id="hlines" class="hcode"></ol>
  <p id="hsub"></p>
  <label id="hprompt" class="hcode"><span id="hpr">&gt;&gt;&gt;</span><input id="hinp" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="60" aria-label="Type the next line here"></label>
  <p id="hfb" class="fb"></p>
  <p id="hhelp"></p>
  <div id="hgauge"><p class="tl" id="hgl"></p><div class="hbar"><i id="hgb"></i></div></div>
  <button id="hrun" class="hbtn" type="button"></button>
</div>
<div id="hfly" class="hcode"></div>
<div id="hover"><div class="hp" id="hp"></div></div>
<div id="hnav"><button id="hback" class="hpill" type="button">Back</button><button id="hnext" class="hpill go" type="button">Next</button></div>
<div id="hprints"></div>
<div id="hlane"></div>
<div id="hwelcome"><div><p id="hwmsg"></p><button id="hwgo" class="hbtn" type="button">Carry on</button></div></div>
<button id="hpause" class="tog" type="button">Pause the story</button>
<div id="hpaused"><div><p>The story is paused.</p><p class="sub">The clock and the storm stand still until you press Carry on.</p><button id="hpgo" class="hbtn" type="button">Carry on</button></div></div>
<div id="hbadge"><div class="card"><canvas id="hbicon"></canvas><h2>Badge earned</h2><p id="hbname"></p><p id="hbxp"></p><button id="hbgo" class="hbtn" type="button">Onward</button></div></div>
<button id="hlast" class="hpill" type="button">Running out of time? Go to the 5 questions Blink asks at the end.</button>
'''

assert src.count('</head>') == 1 and src.count('<script src="rescue/chars.js"></script>') == 1 and src.count('<script src="rescue/film.js"></script>') == 1


def page(prefix, probe):
    out = src.replace('<title>The Rescue: art test</title>', '<title>The Rescue</title>')
    out = out.replace('</head>', '<link rel="stylesheet" href="rescue/hour.css">\n</head>')
    tag = lambda f: '<script src="rescue/%s"></script>' % f
    before = '\n'.join(tag(f) for f in SCRIPTS_BEFORE)
    if probe:
        before = '<script>window.__RescueOpt = location.search; /* the gates only */</script>\n' + before
    out = out.replace(tag('chars.js'), DOM + before + '\n' + tag('chars.js'))
    out = out.replace(tag('film.js'), tag('film.js') + '\n' + '\n'.join(tag(f) for f in SCRIPTS_AFTER))
    return out.replace('"rescue/', '"' + prefix + 'rescue/')


def write(rel, text):
    p = os.path.join(KS3, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text)
    print(rel, len(text.encode('utf-8')), 'bytes')


write('platform/assets/rescue/hour.html', page('', False))
write('probes/rescue/hour.html', page('../../platform/assets/rescue/', True))
write('probes/rescue/art-test.html', src.replace('"rescue/', '"../../platform/assets/rescue/rescue/'))
