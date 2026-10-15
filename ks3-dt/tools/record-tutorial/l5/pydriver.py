# TWO LIGHTS red-text gate · real python3 side.
# Reads [{id, src, file}] as JSON on stdin. Each program is written to its own folder and run as a script,
# `python3 north_light.py`, exactly as a pupil's file would run. light/horn/radio are added as builtins by the
# sitecustomize.py beside this file. Writes [{id, out, red, effects}] as JSON.
import json, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
work = tempfile.mkdtemp(prefix='l5-redtext-')

def run(ic):
    i, case = ic
    d = os.path.join(work, str(i)); os.makedirs(d)
    fn = os.path.join(d, case['file'])
    with open(fn, 'w', encoding='utf-8') as f:
        f.write(case['src'] + '\n')
    fx = os.path.join(d, 'fx.json')
    env = dict(os.environ, PYTHONPATH=HERE, L5_FX=fx, PYTHON_COLORS='0', NO_COLOR='1', PYTHONIOENCODING='utf-8')
    p = subprocess.run([sys.executable, case['file']], cwd=d, env=env, capture_output=True, text=True, timeout=20)
    red = p.stderr.replace(os.path.realpath(d) + os.sep, '').replace(d + os.sep, '')
    out = p.stdout.split('\n')
    if out and out[-1] == '':
        out.pop()
    eff = json.load(open(fx)) if os.path.exists(fx) else []
    return {'id': case['id'], 'out': out, 'red': red, 'effects': eff}

cases = json.load(sys.stdin)
with ThreadPoolExecutor(10) as ex:
    res = list(ex.map(run, enumerate(cases)))
json.dump(res, sys.stdout)
