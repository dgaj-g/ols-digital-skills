/* stage-subjects.js — THE FILM LAW CAN NOW SEE INSIDE A WEBGL STAGE.
 *
 * WHY THIS EXISTS, on the record (31 Aug 2026). Damien opened J3 Lesson 3's
 * film and found the caption sitting on top of the rack's "playlist" name tag
 * — the exact fault class DFM 141a exists to refuse, on the exact sentence
 * that POINTS AT the tag it was covering. He had been told, after the V62
 * catch on j2-l3, that this could not happen again. That promise was bigger
 * than the machinery behind it: the caption-over-subject law reads DOM
 * rectangles, and this stage is one full-bleed <canvas> — the rack, the boxes
 * and the tag are pixels inside a WebGL scene, so the law saw an empty page
 * and passed every frame. The catch he was shown was on a DOM stage; the
 * guarantee silently did not extend to canvas stages, and nothing said so.
 *
 * THE FIX IS DERIVED COVERAGE, NEVER ENUMERATED (DFM 271). Every piece of
 * text on these stages is born in one place — the stage's label() factory —
 * so the factory tags each mesh (userData.subjectText) and this module
 * projects every visible tagged mesh to screen pixels on demand. No scene
 * lists its own subjects; a label that exists is a subject, always.
 *
 * AND THE LAW NOW FAILS CLOSED (cinema.js UNSEEN-STAGE): a full-bleed canvas
 * stage that does not install this module refuses to be captioned at all in
 * enforce mode. A future stage cannot repeat this by simply saying nothing.
 */
(function () {
  'use strict';
  window.__installStageSubjects = function (THREE, scene, camera, renderer) {
    function effectivelyVisible(o) {
      var n = o;
      while (n) { if (n.visible === false) return false; n = n.parent; }
      var m = o.material;
      if (m && m.transparent && typeof m.opacity === 'number' && m.opacity < 0.05) return false;
      return true;
    }
    window.__stageSubjects = function () {
      var out = [];
      var cnv = renderer.domElement.getBoundingClientRect();
      camera.updateMatrixWorld();
      scene.updateMatrixWorld(true);
      scene.traverse(function (o) {
        var text = o.userData && o.userData.subjectText;
        if (!text || !effectivelyVisible(o)) return;
        var box = new THREE.Box3().setFromObject(o);
        if (box.isEmpty()) return;
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, inFront = false;
        for (var xi = 0; xi < 2; xi++) for (var yi = 0; yi < 2; yi++) for (var zi = 0; zi < 2; zi++) {
          var p = new THREE.Vector3(
            xi ? box.max.x : box.min.x,
            yi ? box.max.y : box.min.y,
            zi ? box.max.z : box.min.z).project(camera);
          if (p.z < 1) inFront = true;
          var sx = cnv.left + (p.x + 1) / 2 * cnv.width;
          var sy = cnv.top + (1 - p.y) / 2 * cnv.height;
          if (sx < minX) minX = sx; if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
        }
        if (!inFront) return;
        out.push({
          name: 'stage', text: String(text).slice(0, 70),
          rect: { left: minX, top: minY, right: maxX, bottom: maxY,
                  width: maxX - minX, height: maxY - minY }
        });
      });
      return out;
    };
  };
})();
