#!/usr/bin/env python3
"""deck_steps.py — click-by-click pictures for the S1 slide sets (v12, 11 Nov 2026).

A slide picture exported by PowerPoint shows the slide in its finished state, so anything that appears on a click
(an exam answer, a worked step) is on show at once. This tool reads each slide's click animations from the .pptx and
writes "variant" decks: in variant k every slide is as it stands after k clicks (later parts hidden). PowerPoint then
exports each variant to PDF, and page i of variant k becomes the picture NN-k.webp (k = 0 … clicks-1); the existing
NN.webp stays the finished slide.

  python3 deck_steps.py map <deck.pptx>                 -> {"10": 3, ...}  (shown-slide number: clicks)
  python3 deck_steps.py info <deck.pptx>                -> {"n": shown slides, "all": all slides, "steps": the map}
  python3 deck_steps.py variant <deck.pptx> <k> <out>   -> writes the variant deck for k clicks
  python3 deck_steps.py boxes <deck.pptx>               -> where each animated part sits, per slide and click
  python3 deck_steps.py show <deck.pptx> <slide>        -> what appears on each click of one slide (for checking)

Rules (the gate G9 re-derives the map with this same reader):
  * Only shown slides count (a slide hidden in the show is not exported).
  * The main sequence only. A group that starts by itself at the start of the slide is part of the first picture; a
    group that starts by itself later joins the click before it. Click triggers (interactive sequences) and exit
    effects make the tool stop with an error, so a deck that needs them is never shown wrongly.
  * A whole shape (or group, picture, table, ink) that appears later is hidden (cNvPr hidden="1", in both copies when the
    part is inside mc:AlternateContent); a paragraph that appears
    later has its text made invisible and its bullet removed, so nothing else on the slide moves.
"""
import sys, json, zipfile, posixpath
from lxml import etree

NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
P, A = '{%s}' % NS['p'], '{%s}' % NS['a']


def shown_slide_parts(z):
    pres = etree.fromstring(z.read('ppt/presentation.xml'))
    rels = etree.fromstring(z.read('ppt/_rels/presentation.xml.rels'))
    rmap = {r.get('Id'): r.get('Target') for r in rels}
    out = []
    for s in pres.findall('.//p:sldIdLst/p:sldId', NS):
        t = rmap[s.get('{%s}id' % NS['r'])]
        part = t[1:] if t.startswith('/') else posixpath.normpath(posixpath.join('ppt', t))
        root = etree.fromstring(z.read(part))
        if root.get('show') == '0':
            continue
        out.append((part, root))
    return out


def _effects(node):
    res = []
    for ctn in node.iter(P + 'cTn'):
        pc = ctn.get('presetClass')
        if pc is None:
            continue
        tg = []
        for sp in ctn.iter(P + 'spTgt'):
            pr = sp.find('.//p:txEl/p:pRg', NS)
            other = sp.find('p:bg', NS) is not None or sp.find('p:graphicEl', NS) is not None or sp.find('p:oleChartEl', NS) is not None
            if other:
                raise SystemExit('a part of a chart, diagram or background is animated (shape %s); not handled' % sp.get('spid'))
            t = (sp.get('spid'), (int(pr.get('st')), int(pr.get('end'))) if pr is not None else None)
            if t not in tg:
                tg.append(t)
        res.append({'cls': pc, 'node': ctn.get('nodeType'), 'tg': tg})
    return res


def slide_steps(root, where=''):
    """(clicks, {target: step}) — step = the click on which the target appears (0 = there when the slide opens)."""
    timing = root.find('p:timing', NS)
    if timing is None:
        return 0, {}
    appear, step, started = {}, 0, False
    for ctn in timing.iter(P + 'cTn'):
        nt = ctn.get('nodeType')
        if nt == 'interactiveSeq':
            raise SystemExit('%s: a click trigger (interactive sequence) is used; not handled' % where)
        if nt != 'mainSeq':
            continue
        for g in ctn.findall('p:childTnLst/p:par', NS):
            eff = _effects(g)
            if not eff:
                continue
            if eff[0]['node'] == 'clickEffect':
                step += 1
            started = True
            for e in eff:
                if e['cls'] == 'exit':
                    raise SystemExit('%s: an exit effect is used; not handled' % where)
                if e['cls'] != 'entr':
                    continue  # emphasis / motion: the part is already on the slide
                for t in e['tg']:
                    appear.setdefault(t, step)
    return step, appear


# ---- where each animated part sits (for the gate's "nothing else moved" check) ----
def _rels(z, part):
    rp = posixpath.join(posixpath.dirname(part), '_rels', posixpath.basename(part) + '.rels')
    try:
        rels = etree.fromstring(z.read(rp))
    except KeyError:
        return {}
    return {r.get('Type').rsplit('/', 1)[-1]: posixpath.normpath(posixpath.join(posixpath.dirname(part), r.get('Target'))) for r in rels}


def _xfrm(el):
    tag = etree.QName(el).localname
    if tag == 'graphicFrame':
        return el.find('p:xfrm', NS)
    pr = el.find('p:grpSpPr' if tag == 'grpSp' else 'p:spPr', NS)
    return pr.find('a:xfrm', NS) if pr is not None else None


def _ph_xfrm(z, part, el):
    ph = el.find('./*/p:nvPr/p:ph', NS)
    if ph is None:
        return None
    look = part
    for kind in ('slideLayout', 'slideMaster'):
        look = _rels(z, look).get(kind)
        if not look:
            return None
        root = etree.fromstring(z.read(look))
        for c in root.iter(P + 'ph'):
            same = (ph.get('idx') is not None and c.get('idx') == ph.get('idx')) or (c.get('type', 'body') == ph.get('type', 'body') and (ph.get('idx') is None or kind == 'slideMaster'))
            if same:
                x = _xfrm(c.getparent().getparent().getparent())
                if x is not None and x.find('a:off', NS) is not None:
                    return x
    return None


def _box(z, part, el):
    import math
    x = _xfrm(el)
    if x is None or x.find('a:off', NS) is None:
        x = _ph_xfrm(z, part, el)
    if x is None:
        return None
    o, e = x.find('a:off', NS), x.find('a:ext', NS)
    x0, y0, w, h = int(o.get('x')), int(o.get('y')), int(e.get('cx')), int(e.get('cy'))
    rot = int(x.get('rot', '0')) / 60000.0
    if rot % 180:
        cx, cy, a = x0 + w / 2, y0 + h / 2, math.radians(rot)
        W = abs(w * math.cos(a)) + abs(h * math.sin(a)); H = abs(w * math.sin(a)) + abs(h * math.cos(a))
        x0, y0, w, h = cx - W / 2, cy - H / 2, W, H
    pts = [(x0, y0), (x0 + w, y0 + h)]
    g = el.getparent()
    while g is not None and etree.QName(g).localname == 'grpSp':
        gx = _xfrm(g)
        if gx is not None and gx.find('a:chOff', NS) is not None:
            go, ge, co, ce = gx.find('a:off', NS), gx.find('a:ext', NS), gx.find('a:chOff', NS), gx.find('a:chExt', NS)
            sx = int(ge.get('cx')) / max(1, int(ce.get('cx'))); sy = int(ge.get('cy')) / max(1, int(ce.get('cy')))
            pts = [(int(go.get('x')) + (px - int(co.get('x'))) * sx, int(go.get('y')) + (py - int(co.get('y'))) * sy) for px, py in pts]
        g = g.getparent()
    return pts[0][0], pts[0][1], pts[1][0], pts[1][1]


def deck_boxes(path):
    """{shown slide: [[click, x0, y0, x1, y1], ...]} — each animated part's box as fractions of the slide (text boxes run to
    the foot of the slide, since text may spill below its box). None for a part whose place cannot be found."""
    z = zipfile.ZipFile(path)
    sz = etree.fromstring(z.read('ppt/presentation.xml')).find('p:sldSz', NS)
    SW, SH = int(sz.get('cx')), int(sz.get('cy'))
    out = {}
    for i, (part, root) in enumerate(shown_slide_parts(z), 1):
        c, appear = slide_steps(root)
        if not c:
            continue
        tree = root.find('p:cSld/p:spTree', NS)
        rows = []
        for (spid, pr), st in appear.items():
            el = tree.find('.//p:cNvPr[@id="%s"]' % spid, NS).getparent().getparent()
            b = _box(z, part, el)
            if b is None:
                rows.append([st, 0, 0, 1, 1]); continue
            pad = 0  # a shadow or glow spills outside the box
            for sh in el.iter(A + 'outerShdw'):
                pad = max(pad, int(sh.get('dist', '0')) + int(sh.get('blurRad', '0')))
            for gl in el.iter(A + 'glow'):
                pad = max(pad, int(gl.get('rad', '0')))
            y1 = (b[3] + pad) / SH
            if any(True for _ in el.iter(P + 'txBody')) or any(True for _ in el.iter(A + 'tbl')):
                y1 = 1  # text may spill below its box, and table rows grow with their text
            rows.append([st, round(max(0, b[0] - pad) / SW, 4), round(max(0, b[1] - pad) / SH, 4), round(min(SW, b[2] + pad) / SW, 4), round(min(1, y1), 4)])
        out[str(i)] = rows
    return out


def deck_map(path):
    z = zipfile.ZipFile(path)
    m = {}
    for i, (part, root) in enumerate(shown_slide_parts(z), 1):
        c, _ = slide_steps(root, '%s slide %d' % (path, i))
        if c:
            m[str(i)] = c
    return m


def _invisible_paragraph(p):
    for r in p.findall('a:r', NS) + p.findall('a:fld', NS):
        rpr = r.find('a:rPr', NS)
        if rpr is None:
            rpr = etree.Element(A + 'rPr')
            r.insert(0, rpr)
        for tag in ('noFill', 'solidFill', 'gradFill', 'blipFill', 'pattFill', 'grpFill', 'highlight', 'effectLst', 'effectDag'):
            for x in rpr.findall('a:' + tag, NS):
                rpr.remove(x)
        ln = rpr.find('a:ln', NS)
        if ln is not None:
            for x in list(ln):
                ln.remove(x)
            etree.SubElement(ln, A + 'noFill')
            ln.addnext(etree.Element(A + 'noFill'))
        else:
            rpr.insert(0, etree.Element(A + 'noFill'))
    ppr = p.find('a:pPr', NS)
    if ppr is None:
        ppr = etree.Element(A + 'pPr')
        p.insert(0, ppr)
    for tag in ('buNone', 'buAutoNum', 'buChar', 'buBlip'):
        for x in ppr.findall('a:' + tag, NS):
            ppr.remove(x)
    nb = etree.Element(A + 'buNone')
    after = [x for x in ppr if etree.QName(x).localname in ('tabLst', 'defRPr', 'extLst')]
    if after:
        after[0].addprevious(nb)
    else:
        ppr.append(nb)


def hide_after(root, appear, k, where=''):
    tree = root.find('p:cSld/p:spTree', NS)
    for (spid, pr), st in appear.items():
        if st <= k:
            continue
        c = tree.find('.//p:cNvPr[@id="%s"]' % spid, NS)
        if c is None:
            raise SystemExit('%s: animated shape %s not found' % (where, spid))
        if pr is None:
            c.set('hidden', '1')
            alt = next((a for a in c.iterancestors() if etree.QName(a).localname == 'AlternateContent'), None)
            if alt is not None:  # ink and other newer parts: PowerPoint reads the mc:Choice copy, not the fallback
                for x in alt.iter():
                    if isinstance(x.tag, str) and etree.QName(x).localname == 'cNvPr' and x.get('id') == spid:
                        x.set('hidden', '1')
            continue
        sp = c.getparent().getparent()
        body = sp.find('p:txBody', NS)
        if body is None:
            raise SystemExit('%s: shape %s has paragraph builds but no text' % (where, spid))
        paras = body.findall('a:p', NS)
        for j in range(pr[0], min(pr[1], len(paras) - 1) + 1):
            _invisible_paragraph(paras[j])


def write_variant(path, k, out):
    zin = zipfile.ZipFile(path)
    changed = {}
    for i, (part, root) in enumerate(shown_slide_parts(zin), 1):
        where = '%s slide %d' % (path, i)
        c, appear = slide_steps(root, where)
        if c > k:
            hide_after(root, appear, k, where)
            changed[part] = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
    with zipfile.ZipFile(out, 'w') as zout:
        for info in zin.infolist():
            data = changed.get(info.filename)
            zout.writestr(info, data if data is not None else zin.read(info.filename))
    return sorted(changed)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'map':
        print(json.dumps(deck_map(sys.argv[2])))
    elif cmd == 'boxes':
        print(json.dumps(deck_boxes(sys.argv[2])))
    elif cmd == 'info':
        z = zipfile.ZipFile(sys.argv[2])
        total = len(etree.fromstring(z.read('ppt/presentation.xml')).findall('.//p:sldIdLst/p:sldId', NS))
        print(json.dumps({'n': len(shown_slide_parts(z)), 'all': total, 'steps': deck_map(sys.argv[2])}))
    elif cmd == 'variant':
        ch = write_variant(sys.argv[2], int(sys.argv[3]), sys.argv[4])
        print('variant', sys.argv[3], 'slides changed', len(ch))
    elif cmd == 'show':
        z = zipfile.ZipFile(sys.argv[2])
        part, root = shown_slide_parts(z)[int(sys.argv[3]) - 1]
        c, ap = slide_steps(root)
        tree = root.find('p:cSld/p:spTree', NS)
        for (spid, pr), st in sorted(ap.items(), key=lambda x: x[1]):
            cn = tree.find('.//p:cNvPr[@id="%s"]' % spid, NS)
            sp = cn.getparent().getparent()
            txt = ' '.join(t.text or '' for t in sp.iter(A + 't'))[:80]
            print('click', st, '| shape', spid, cn.get('name'), '| paras', pr, '|', txt)
    else:
        raise SystemExit(__doc__)
