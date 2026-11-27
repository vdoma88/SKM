/**
 * SKM v2.3 — Client-Side 3D CAD Workpiece Analyzer (STEP ISO 10303-21 & Binary/ASCII STL)
 * + Procedural 3D Workpiece Solid Mesh Generator & Demo .STEP Exporter.
 * Works 100% standalone in browser (GitHub Pages / Offline PWA) and mirrors app/cad_workpiece.py.
 */

(function (global) {
  "use strict";

  function splitStepArgs(argStr) {
    const parts = [];
    let cur = "", depth = 0, inStr = false;
    for (let i = 0; i < argStr.length; i++) {
      const ch = argStr[i];
      if (ch === "'" && !inStr) { inStr = true; cur += ch; }
      else if (ch === "'" && inStr) {
        if (argStr[i + 1] === "'") { cur += "''"; i++; }
        else { inStr = false; cur += ch; }
      } else if (!inStr) {
        if (ch === "(") { depth++; cur += ch; }
        else if (ch === ")") { depth = Math.max(0, depth - 1); cur += ch; }
        else if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; }
        else cur += ch;
      } else cur += ch;
    }
    if (cur || parts.length) parts.push(cur.trim());
    return parts;
  }

  function parseNumTuple(s) {
    const noQ = (s || "").replace(/'[^']*'/g, "");
    const m = noQ.match(/\(([^()]+)\)/);
    const target = m ? m[1] : noQ;
    const nums = target.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
    if (nums && nums.length >= 3) return [parseFloat(nums[0]), parseFloat(nums[1]), parseFloat(nums[2])];
    return null;
  }

  function extractRefs(s) {
    const noQ = (s || "").replace(/'[^']*'/g, "");
    return [...noQ.matchAll(/#(\d+)/g)].map((m) => parseInt(m[1], 10));
  }

  function normVec(v) {
    const mag = Math.hypot(v[0], v[1], v[2]);
    if (mag < 1e-9) return [0, 0, 1];
    let x = v[0] / mag, y = v[1] / mag, z = v[2] / mag;
    if (z < -1e-4 || (Math.abs(z) <= 1e-4 && y < -1e-4) || (Math.abs(z) <= 1e-4 && Math.abs(y) <= 1e-4 && x < -1e-4)) {
      x = -x; y = -y; z = -z;
    }
    return [x, y, z];
  }

  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  // ---------------------------------------------------------------------------
  // 1. ISO 10303-21 STEP B-Rep Feature Recognizer (Client JS)
  // ---------------------------------------------------------------------------
  function parseStepWorkpieceClient(stepText, filename) {
    const cleaned = (stepText || "").replace(/\/\*[\s\S]*?\*\//g, " ");
    let partName = (filename || "model.step").replace(/\.[^.]+$/, "");
    const mFn = cleaned.match(/FILE_NAME\s*\(\s*'([^']+)'/i);
    if (mFn && mFn[1].trim()) partName = mFn[1].trim().replace(/\.[^.]+$/, "");

    const entities = new Map();
    const entRx = /#(\d+)\s*=\s*([A-Z0-9_]+)\s*\(([\s\S]*?)\)\s*;/gi;
    let m;
    while ((m = entRx.exec(cleaned)) !== null) {
      entities.set(parseInt(m[1], 10), [m[2].toUpperCase(), m[3].trim()]);
    }

    for (const [etype, eargs] of entities.values()) {
      if (etype === "PRODUCT") {
        const args = splitStepArgs(eargs);
        if (args.length >= 2) {
          const pn = args[1].trim().replace(/^'|'$/g, "");
          if (pn && !["none", "part", "solid"].includes(pn.toLowerCase())) { partName = pn; break; }
        }
      }
    }

    const points = new Map(), dirs = new Map(), axes = new Map(), cyls = new Map(), planes = new Map(), circles = new Map();
    const vertexPts = [];
    let conicalCnt = 0, freeformCnt = 0;

    for (const [eid, [etype, eargs]] of entities.entries()) {
      if (etype === "CARTESIAN_POINT") { const pt = parseNumTuple(eargs); if (pt) points.set(eid, pt); }
      else if (etype === "DIRECTION") { const dv = parseNumTuple(eargs); if (dv) dirs.set(eid, normVec(dv)); }
    }
    for (const [eid, [etype, eargs]] of entities.entries()) {
      if (etype === "VERTEX_POINT") {
        const r = extractRefs(eargs);
        if (r.length && points.has(r[0])) vertexPts.push(points.get(r[0]));
      } else if (etype === "AXIS2_PLACEMENT_3D") {
        const r = extractRefs(eargs);
        axes.set(eid, [r.length >= 1 && points.has(r[0]) ? points.get(r[0]) : [0, 0, 0], r.length >= 2 && dirs.has(r[1]) ? dirs.get(r[1]) : [0, 0, 1]]);
      }
    }
    for (const [eid, [etype, eargs]] of entities.entries()) {
      if (etype === "CYLINDRICAL_SURFACE") {
        const args = splitStepArgs(eargs);
        const r = args.length >= 2 ? extractRefs(args[1]) : [];
        const rad = args.length >= 3 ? Math.abs(parseFloat(args[2])) : NaN;
        if (r.length && axes.has(r[0]) && rad > 0.2) {
          const [origin, axis] = axes.get(r[0]);
          cyls.set(eid, { id: eid, origin, axis, radius_mm: rad, diameter_mm: +(rad * 2).toFixed(2), same_senses: [], z_coords: [] });
        }
      } else if (etype === "PLANE") {
        const r = extractRefs(eargs);
        if (r.length && axes.has(r[0])) planes.set(eid, axes.get(r[0]));
      } else if (etype === "CIRCLE") {
        const args = splitStepArgs(eargs);
        const r = args.length >= 2 ? extractRefs(args[1]) : [];
        const rad = args.length >= 3 ? Math.abs(parseFloat(args[2])) : NaN;
        if (r.length && axes.has(r[0]) && rad > 0.2) {
          const [origin, axis] = axes.get(r[0]);
          circles.set(eid, { origin, axis, radius_mm: rad });
        }
      } else if (etype === "CONICAL_SURFACE") conicalCnt++;
      else if (["TOROIDAL_SURFACE", "SPHERICAL_SURFACE", "B_SPLINE_SURFACE", "B_SPLINE_SURFACE_WITH_KNOTS"].includes(etype)) freeformCnt++;
    }

    // Link ADVANCED_FACE -> CYLINDRICAL_SURFACE same_sense
    for (const [, [etype, eargs]] of entities.entries()) {
      if (etype === "ADVANCED_FACE") {
        const args = splitStepArgs(eargs);
        if (args.length >= 4) {
          const sRefs = extractRefs(args[2]);
          const sense = args[3].trim().toUpperCase() === ".T.";
          if (sRefs.length && cyls.has(sRefs[0])) cyls.get(sRefs[0]).same_senses.push(sense);
        }
      }
    }

    // Match CIRCLEs to cylindrical surfaces for axial span
    for (const cInfo of circles.values()) {
      for (const cs of cyls.values()) {
        if (Math.abs(cs.radius_mm - cInfo.radius_mm) > 0.08) continue;
        if (Math.abs(dot3(cs.axis, cInfo.axis)) < 0.995) continue;
        const dx = cInfo.origin[0] - cs.origin[0], dy = cInfo.origin[1] - cs.origin[1], dz = cInfo.origin[2] - cs.origin[2];
        const proj = dx * cs.axis[0] + dy * cs.axis[1] + dz * cs.axis[2];
        const perp = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - proj * proj));
        if (perp < 0.15) cs.z_coords.push(dot3(cInfo.origin, cs.axis));
      }
    }

    // Bounding Box
    const bboxPts = vertexPts.slice();
    for (const cInfo of circles.values()) {
      const [ox, oy, oz] = cInfo.origin, r = cInfo.radius_mm, ax = cInfo.axis;
      if (Math.abs(ax[2]) > 0.9) bboxPts.push([ox - r, oy, oz], [ox + r, oy, oz], [ox, oy - r, oz], [ox, oy + r, oz]);
      else if (Math.abs(ax[0]) > 0.9) bboxPts.push([ox, oy - r, oz], [ox, oy + r, oz], [ox, oy, oz - r], [ox, oy, oz + r]);
      else bboxPts.push([ox - r, oy, oz], [ox + r, oy, oz], [ox, oy, oz - r], [ox, oy, oz + r]);
    }
    if (!bboxPts.length) for (const pt of points.values()) bboxPts.push(pt);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, y, z] of bboxPts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const bboxX = isFinite(minX) ? +(maxX - minX).toFixed(1) : 0;
    const bboxY = isFinite(minY) ? +(maxY - minY).toFixed(1) : 0;
    const bboxZ = isFinite(minZ) ? +(maxZ - minZ).toFixed(1) : 0;

    // Merge split cylinders
    const merged = new Map();
    for (const cs of cyls.values()) {
      const proj = dot3(cs.origin, cs.axis);
      const px = +(cs.origin[0] - proj * cs.axis[0]).toFixed(1);
      const py = +(cs.origin[1] - proj * cs.axis[1]).toFixed(1);
      const pz = +(cs.origin[2] - proj * cs.axis[2]).toFixed(1);
      const key = `${cs.axis[0].toFixed(2)},${cs.axis[1].toFixed(2)},${cs.axis[2].toFixed(2)}|${px},${py},${pz}|${cs.diameter_mm.toFixed(2)}`;
      if (!merged.has(key)) merged.set(key, { diameter_mm: cs.diameter_mm, axis: cs.axis, origin_perp: [px, py, pz], same_senses: cs.same_senses.slice(), z_coords: cs.z_coords.slice() });
      else {
        merged.get(key).same_senses.push(...cs.same_senses);
        merged.get(key).z_coords.push(...cs.z_coords);
      }
    }

    const allMerged = [...merged.values()];
    const maxCylD = allMerged.reduce((a, c) => Math.max(a, c.diameter_mm), 0);
    const dimsSorted = [bboxX, bboxY, bboxZ].sort((a, b) => a - b);
    const defDepth = dimsSorted[0] > 0 ? +Math.max(dimsSorted[0], 15).toFixed(1) : 25;

    const extCyls = [], intCyls = [];
    for (const c of allMerged) {
      const zs = c.z_coords;
      const zSpan = zs.length >= 2 ? +(Math.max(...zs) - Math.min(...zs)).toFixed(1) : 0;
      const lenMm = zSpan > 0.2 ? zSpan : defDepth;
      const senses = c.same_senses;
      const isInt = senses.length ? senses.filter((x) => !x).length >= senses.filter((x) => x).length : c.diameter_mm < maxCylD * 0.85;
      const item = { diameter_mm: c.diameter_mm, length_mm: lenMm, axis: c.axis, origin_perp: c.origin_perp, is_internal: isInt };
      if (isInt) intCyls.push(item); else extCyls.push(item);
    }

    const maxExtD = extCyls.reduce((a, c) => Math.max(a, c.diameter_mm), 0);
    let rotational = false;
    if (maxExtD > 5 && bboxX > 0 && bboxY > 0 && bboxZ > 0) {
      const nearD = [bboxX, bboxY, bboxZ].filter((d) => Math.abs(d - maxExtD) <= Math.max(2.5, maxExtD * 0.08)).length;
      if (nearD >= 2) rotational = true;
    }

    const holeMap = new Map();
    for (const ic of intCyls) {
      const k = `${ic.diameter_mm.toFixed(1)}|${Math.round(ic.length_mm)}`;
      if (!holeMap.has(k)) holeMap.set(k, { diameter_mm: +ic.diameter_mm.toFixed(1), depth_mm: Math.round(ic.length_mm), count: 1 });
      else holeMap.get(k).count++;
    }
    const holeGroups = [...holeMap.values()].sort((a, b) => a.diameter_mm - b.diameter_mm);

    const grooves = [];
    if (rotational && extCyls.length >= 2) {
      for (const ec of extCyls) {
        if (ec.diameter_mm < maxExtD * 0.96 && ec.length_mm >= 1.2 && ec.length_mm <= 8.0) {
          grooves.push({ diameter_mm: ec.diameter_mm, width_mm: ec.length_mm });
        }
      }
    }

    const features = [];
    let fSeq = 1;
    const addF = (kind, title, extra) => features.push({ id: `cad-${fSeq++}`, kind, title, count: 1, diameter_mm: null, length_or_depth_mm: null, width_mm: null, thread_code: null, tolerance: null, ra_um: null, hole_type: "BLIND", source: "STEP_3D", notes: "", ...extra });

    if (rotational) {
      const axLen = [bboxX, bboxY, bboxZ].find((d) => Math.abs(d - maxExtD) > Math.max(2.5, maxExtD * 0.08)) || Math.max(bboxX, bboxY, bboxZ);
      addF("EXTERNAL_ROUGH", `Наружное точение Ø${maxExtD} (из STEP)`, { diameter_mm: maxExtD, length_or_depth_mm: +axLen.toFixed(1), notes: `Распознано ${extCyls.length} наруж. цилиндров (3D STEP)` });
      if (extCyls.length >= 2) {
        addF("EXTERNAL_FINISH", `Чистовое точение ступеней Ø${maxExtD}`, { diameter_mm: maxExtD, length_or_depth_mm: +axLen.toFixed(1), ra_um: 1.6, notes: "Ступенчатый профиль в 3D STEP" });
      }
      for (const g of grooves.slice(0, 2)) {
        addF("GROOVE_PARTING", `Канавка из STEP (шир. ${g.width_mm} мм, Ø${g.diameter_mm})`, { diameter_mm: g.diameter_mm, width_mm: g.width_mm, notes: "Узкая проточка в 3D STEP" });
      }
    } else {
      if (planes.size >= 2) addF("FACE_MILL", `Торцевое фрезерование плоскостей (${bboxX}×${bboxY} мм)`, { length_or_depth_mm: Math.max(bboxX, bboxY, bboxZ) || 120, notes: `Обнаружено ${planes.size} плоских граней` });
      if (planes.size >= 6 || extCyls.length >= 1) addF("SHOULDER_POCKET", "Фрезерование уступов / контура / карманов (90°)", { length_or_depth_mm: Math.max(bboxX, bboxY, bboxZ) || 100, notes: "Контурная и уступная 3D-обработка" });
    }

    for (const hg of holeGroups) {
      if (hg.diameter_mm < 2) continue;
      if (hg.diameter_mm >= 42 || (rotational && hg.diameter_mm >= 26 && hg.count === 1)) {
        addF("INTERNAL_BORE", `Внутреннее растачивание Ø${hg.diameter_mm} (из STEP)`, { diameter_mm: hg.diameter_mm, length_or_depth_mm: hg.depth_mm, count: hg.count, notes: "Крупное внутреннее отверстие (3D STEP)" });
      } else {
        addF("HOLE_DRILL", `Сверление отверстия Ø${hg.diameter_mm} (из STEP)${hg.count > 1 ? ` (${hg.count} отв.)` : ""}`, { diameter_mm: hg.diameter_mm, length_or_depth_mm: hg.depth_mm, count: hg.count, notes: `B-Rep CYLINDRICAL_SURFACE Ø${hg.diameter_mm}, глуб. ${hg.depth_mm} мм` });
      }
    }
    if (freeformCnt >= 2) addF("COPY_3D", "3D-фрезерование криволинейных поверхностей", { notes: `${freeformCnt} тороидальных / B-spline граней` });

    let stockVol = 0, partVol = 0;
    if (rotational && maxExtD > 0) {
      const axLen = [bboxX, bboxY, bboxZ].find((d) => Math.abs(d - maxExtD) > Math.max(2.5, maxExtD * 0.08)) || Math.max(bboxX, bboxY, bboxZ);
      stockVol = +((Math.PI * Math.pow((maxExtD + 4) / 2, 2) * (axLen + 4)) / 1000).toFixed(1);
      partVol = +(stockVol * 0.68).toFixed(1);
    } else if (bboxX && bboxY && bboxZ) {
      stockVol = +(((bboxX + 4) * (bboxY + 4) * (bboxZ + 4)) / 1000).toFixed(1);
      partVol = +(stockVol * 0.62).toFixed(1);
    }
    const remVol = +Math.max(0, stockVol - partVol).toFixed(1);
    const hasTurn = features.some((f) => ["EXTERNAL_ROUGH", "EXTERNAL_FINISH", "INTERNAL_BORE", "GROOVE_PARTING"].includes(f.kind));
    const hasMill = features.some((f) => ["FACE_MILL", "SHOULDER_POCKET", "COPY_3D", "HOLE_DRILL"].includes(f.kind));

    return {
      format: "STEP",
      part_name: partName,
      part_type: (hasTurn && hasMill) ? "MILL_TURN" : (hasMill ? "PRISMATIC_MILLED" : "SHAFT_TURNED"),
      entity_count: entities.size,
      bbox_x_mm: bboxX, bbox_y_mm: bboxY, bbox_z_mm: bboxZ,
      max_outer_diameter_mm: rotational ? maxExtD : null,
      planes_count: planes.size,
      external_cylinders_count: extCyls.length,
      internal_holes_count: holeGroups.reduce((a, h) => a + h.count, 0),
      hole_groups: holeGroups,
      freeform_surfaces_count: freeformCnt,
      conical_surfaces_count: conicalCnt,
      stock_volume_cm3: stockVol,
      part_volume_cm3: partVol,
      removal_volume_cm3: remVol,
      features,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Binary & ASCII STL Workpiece Analyzer (Client JS)
  // ---------------------------------------------------------------------------
  function parseStlWorkpieceClient(buffer, filename) {
    const partName = (filename || "model.stl").replace(/\.[^.]+$/, "");
    const view = new DataView(buffer);
    const isBinary = buffer.byteLength >= 84 && 84 + view.getUint32(80, true) * 50 === buffer.byteLength;
    const tris = [];

    if (isBinary) {
      const cnt = Math.min(view.getUint32(80, true), 250000);
      let off = 84;
      for (let i = 0; i < cnt; i++) {
        off += 12; // skip stored normal
        const v0 = [view.getFloat32(off, true), view.getFloat32(off + 4, true), view.getFloat32(off + 8, true)];
        const v1 = [view.getFloat32(off + 12, true), view.getFloat32(off + 16, true), view.getFloat32(off + 20, true)];
        const v2 = [view.getFloat32(off + 24, true), view.getFloat32(off + 28, true), view.getFloat32(off + 32, true)];
        tris.push([v0, v1, v2]);
        off += 38;
      }
    } else {
      const text = new TextDecoder("utf-8").decode(buffer);
      const rx = /vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)[\s\S]*?vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)[\s\S]*?vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi;
      let m;
      while ((m = rx.exec(text)) !== null) {
        tris.push([
          [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])],
          [parseFloat(m[4]), parseFloat(m[5]), parseFloat(m[6])],
          [parseFloat(m[7]), parseFloat(m[8]), parseFloat(m[9])],
        ]);
      }
    }

    if (!tris.length) {
      return { format: "STL", part_name: partName, part_type: "PRISMATIC_MILLED", triangle_count: 0, bbox_x_mm: 0, bbox_y_mm: 0, bbox_z_mm: 0, stock_volume_cm3: 0, part_volume_cm3: 0, removal_volume_cm3: 0, internal_holes_count: 0, hole_groups: [], features: [] };
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    let volMm3 = 0;
    for (const [v0, v1, v2] of tris) {
      for (const v of [v0, v1, v2]) {
        if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0];
        if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1];
        if (v[2] < minZ) minZ = v[2]; if (v[2] > maxZ) maxZ = v[2];
      }
      volMm3 += (v0[0] * (v1[1] * v2[2] - v1[2] * v2[1]) + v0[1] * (v1[2] * v2[0] - v1[0] * v2[2]) + v0[2] * (v1[0] * v2[1] - v1[1] * v2[0])) / 6;
    }
    const dx = +(maxX - minX).toFixed(1), dy = +(maxY - minY).toFixed(1), dz = +(maxZ - minZ).toFixed(1);
    const ctr = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];

    let orthoA = 0, curvedA = 0, inwardA = 0;
    for (const [v0, v1, v2] of tris) {
      const ux = v1[0] - v0[0], uy = v1[1] - v0[1], uz = v1[2] - v0[2];
      const wx = v2[0] - v0[0], wy = v2[1] - v0[1], wz = v2[2] - v0[2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const mag = Math.hypot(nx, ny, nz);
      if (mag < 1e-9) continue;
      const area = 0.5 * mag;
      nx /= mag; ny /= mag; nz /= mag;
      if (Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz)) >= 0.98) orthoA += area;
      else {
        curvedA += area;
        const tx = (v0[0] + v1[0] + v2[0]) / 3 - ctr[0], ty = (v0[1] + v1[1] + v2[1]) / 3 - ctr[1], tz = (v0[2] + v1[2] + v2[2]) / 3 - ctr[2];
        if (nx * tx + ny * ty + nz * tz < -0.1) inwardA += area;
      }
    }

    const totA = Math.max(orthoA + curvedA, 1);
    const curvedRatio = curvedA / totA;
    const partVol = +(Math.abs(volMm3) / 1000).toFixed(1);
    const isRot = (Math.abs(dx - dy) <= Math.max(2, dx * 0.05) && curvedRatio > 0.30)
      || (Math.abs(dy - dz) <= Math.max(2, dy * 0.05) && curvedRatio > 0.30)
      || (Math.abs(dx - dz) <= Math.max(2, dx * 0.05) && curvedRatio > 0.30);

    let outerD = null, axL = dz, stockVol = 0;
    if (isRot) {
      if (Math.abs(dx - dy) <= Math.max(2, dx * 0.05)) { outerD = +((dx + dy) / 2).toFixed(1); axL = dz; }
      else if (Math.abs(dy - dz) <= Math.max(2, dy * 0.05)) { outerD = +((dy + dz) / 2).toFixed(1); axL = dx; }
      else { outerD = +((dx + dz) / 2).toFixed(1); axL = dy; }
      stockVol = +((Math.PI * Math.pow((outerD + 4) / 2, 2) * (axL + 4)) / 1000).toFixed(1);
    } else {
      stockVol = +(((dx + 4) * (dy + 4) * (dz + 4)) / 1000).toFixed(1);
    }
    const remVol = +Math.max(0, stockVol - partVol).toFixed(1);

    const features = [];
    if (isRot && outerD) {
      features.push({ id: "stl-1", kind: "EXTERNAL_ROUGH", title: `Наружное точение Ø${outerD} (из STL)`, diameter_mm: outerD, length_or_depth_mm: axL, width_mm: null, count: 1, thread_code: null, tolerance: null, ra_um: null, hole_type: "BLIND", source: "STL_3D", notes: `Тело вращения STL (${tris.length} треуг., съём ~${remVol} см³)` });
      if (inwardA > totA * 0.06) {
        const estB = +Math.max(8, outerD * 0.35).toFixed(1);
        features.push({ id: "stl-2", kind: estB >= 25 ? "INTERNAL_BORE" : "HOLE_DRILL", title: `Внутренняя полость / отв. (STL, ~Ø${estB})`, diameter_mm: estB, length_or_depth_mm: +(axL * 0.8).toFixed(1), width_mm: null, count: 1, thread_code: null, tolerance: null, ra_um: null, hole_type: "BLIND", source: "STL_3D", notes: "Обнаружены внутренние цилиндрические грани" });
      }
    } else {
      features.push({ id: "stl-1", kind: "FACE_MILL", title: `Торцевое фрезерование плоскостей (${dx}×${dy}×${dz} мм)`, diameter_mm: null, length_or_depth_mm: Math.max(dx, dy, dz), width_mm: null, count: 1, thread_code: null, tolerance: null, ra_um: null, hole_type: "BLIND", source: "STL_3D", notes: `Призматическая заготовка STL (съём ~${remVol} см³)` });
      features.push({ id: "stl-2", kind: "SHOULDER_POCKET", title: "Контурное / уступное фрезерование 90°", diameter_mm: null, length_or_depth_mm: Math.max(dx, dy), width_mm: null, count: 1, thread_code: null, tolerance: null, ra_um: null, hole_type: "BLIND", source: "STL_3D", notes: "Обработка стенок и карманов по 3D STL" });
      if (curvedRatio > 0.35) features.push({ id: "stl-3", kind: "COPY_3D", title: "3D-копировальная обработка криволинейных зон", diameter_mm: null, length_or_depth_mm: null, width_mm: null, count: 1, thread_code: null, tolerance: null, ra_um: null, hole_type: "BLIND", source: "STL_3D", notes: `Криволинейных граней: ${Math.round(curvedRatio * 100)}%` });
    }

    return {
      format: "STL", part_name: partName, part_type: isRot ? "SHAFT_TURNED" : "PRISMATIC_MILLED",
      triangle_count: tris.length, bbox_x_mm: dx, bbox_y_mm: dy, bbox_z_mm: dz,
      max_outer_diameter_mm: outerD, planes_count: 0, external_cylinders_count: isRot ? 1 : 0,
      internal_holes_count: (isRot && inwardA > totA * 0.06) ? 1 : 0, hole_groups: [],
      freeform_surfaces_count: curvedRatio > 0.35 ? 1 : 0,
      stock_volume_cm3: stockVol, part_volume_cm3: partVol, removal_volume_cm3: remVol, features,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Procedural 3D Solid Mesh Builder for Instant 3D Demos & Offline STEP Fallback
  // ---------------------------------------------------------------------------
  function pushTri(pos, nrm, a, b, c) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const m = Math.hypot(nx, ny, nz) || 1;
    nx /= m; ny /= m; nz /= m;
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }

  function addCylinderZ(pos, nrm, cx, cy, z0, z1, rOut, rIn = 0, segs = 40) {
    for (let i = 0; i < segs; i++) {
      const a0 = (2 * Math.PI * i) / segs, a1 = (2 * Math.PI * (i + 1)) / segs;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const bo0 = [cx + rOut * c0, cy + rOut * s0, z0], bo1 = [cx + rOut * c1, cy + rOut * s1, z0];
      const to0 = [cx + rOut * c0, cy + rOut * s0, z1], to1 = [cx + rOut * c1, cy + rOut * s1, z1];
      pushTri(pos, nrm, bo0, bo1, to1);
      pushTri(pos, nrm, bo0, to1, to0);
      if (rIn > 0.1) {
        const bi0 = [cx + rIn * c0, cy + rIn * s0, z0], bi1 = [cx + rIn * c1, cy + rIn * s1, z0];
        const ti0 = [cx + rIn * c0, cy + rIn * s0, z1], ti1 = [cx + rIn * c1, cy + rIn * s1, z1];
        pushTri(pos, nrm, ti0, to0, to1); pushTri(pos, nrm, ti0, to1, ti1);
        pushTri(pos, nrm, bo0, bi0, bi1); pushTri(pos, nrm, bo0, bi1, bo1);
        pushTri(pos, nrm, ti0, ti1, bi1); pushTri(pos, nrm, ti0, bi1, bi0);
      } else {
        pushTri(pos, nrm, [cx, cy, z1], to0, to1);
        pushTri(pos, nrm, [cx, cy, z0], bo1, bo0);
      }
    }
  }

  function addBox(pos, nrm, x0, y0, z0, x1, y1, z1) {
    const p = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    ];
    const quads = [
      [4, 5, 6, 7], [1, 0, 3, 2], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [3, 0, 4, 7],
    ];
    for (const [a, b, c, d] of quads) {
      pushTri(pos, nrm, p[a], p[b], p[c]);
      pushTri(pos, nrm, p[a], p[c], p[d]);
    }
  }

  function buildProceduralWorkpieceParts(demoKind, cad3d) {
    const steelCol = [0.62, 0.72, 0.84];
    const holeCol = [0.16, 0.78, 0.48];
    const grooveCol = [0.95, 0.62, 0.14];

    if (demoKind === "step-shaft-p1") {
      const pBody = [], nBody = [], pGrv = [], nGrv = [], pHole = [], nHole = [];
      // Rotate shaft horizontally along X by swapping coordinates later (here build along Z and rotate)
      addCylinderZ(pBody, nBody, 0, 0, -80, -30, 22.5, 7.0, 44);
      addCylinderZ(pBody, nBody, 0, 0, -30, 35, 32.5, 0, 48);
      addCylinderZ(pGrv, nGrv, 0, 0, 35, 39, 19.0, 0, 40);
      addCylinderZ(pBody, nBody, 0, 0, 39, 80, 21.0, 0, 44);
      addCylinderZ(pHole, nHole, 0, 0, -80.4, -35, 7.0, 6.2, 32);
      return [
        { name: "Shaft Body", positions: pBody, normals: nBody, color: steelCol },
        { name: "Groove 4mm", positions: pGrv, normals: nGrv, color: grooveCol },
        { name: "Axial Hole D14", positions: pHole, normals: nHole, color: holeCol },
      ];
    }

    if (demoKind === "step-flange-m1") {
      const pBody = [], nBody = [], pHoles = [], nHoles = [];
      addCylinderZ(pBody, nBody, 0, 0, -15, 15, 60.0, 14.0, 56);
      // Raised collar
      addCylinderZ(pBody, nBody, 0, 0, 15, 21, 32.0, 14.0, 44);
      // 6 Bolt-hole highlight sleeves (R=44, D=12)
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        addCylinderZ(pHoles, nHoles, 44 * Math.cos(a), 44 * Math.sin(a), -15.6, 15.6, 6.0, 4.8, 24);
      }
      return [
        { name: "Flange Body D120", positions: pBody, normals: nBody, color: [0.76, 0.78, 0.82] },
        { name: "6x Bolt Holes D12", positions: pHoles, normals: nHoles, color: holeCol },
      ];
    }

    if (demoKind === "step-housing-n1") {
      const pBody = [], nBody = [], pHoles = [], nHoles = [];
      // Base plate + raised perimeter walls (pocket look!)
      addBox(pBody, nBody, -70, -50, -22.5, 70, 50, -2.5);
      addBox(pBody, nBody, -70, -50, -2.5, 70, -34, 22.5);
      addBox(pBody, nBody, -70, 34, -2.5, 70, 50, 22.5);
      addBox(pBody, nBody, -70, -34, -2.5, -52, 34, 22.5);
      addBox(pBody, nBody, 52, -34, -2.5, 70, 34, 22.5);
      // Central bearing bore Ø32 + 4 corner holes Ø10
      addCylinderZ(pHoles, nHoles, 0, 0, -2.5, 22.8, 16.0, 14.2, 36);
      for (const [hx, hy] of [[-55, -35], [55, -35], [55, 35], [-55, 35]]) {
        addCylinderZ(pHoles, nHoles, hx, hy, -23.0, 23.0, 5.0, 3.8, 20);
      }
      return [
        { name: "Housing Body 140x100", positions: pBody, normals: nBody, color: [0.78, 0.85, 0.92] },
        { name: "Holes & Bore", positions: pHoles, normals: nHoles, color: holeCol },
      ];
    }

    // Generic fallback built from any parsed cad3d bbox & holes
    const bx = Math.max((cad3d && cad3d.bbox_x_mm) || 80, 10);
    const by = Math.max((cad3d && cad3d.bbox_y_mm) || 80, 10);
    const bz = Math.max((cad3d && cad3d.bbox_z_mm) || 40, 10);
    const pBody = [], nBody = [];
    if (cad3d && cad3d.max_outer_diameter_mm) {
      const r = cad3d.max_outer_diameter_mm / 2;
      const axL = [bx, by, bz].find((d) => Math.abs(d - cad3d.max_outer_diameter_mm) > 3) || bz;
      addCylinderZ(pBody, nBody, 0, 0, -axL / 2, axL / 2, r, 0, 48);
    } else {
      addBox(pBody, nBody, -bx / 2, -by / 2, -bz / 2, bx / 2, by / 2, bz / 2);
    }
    return [{ name: (cad3d && cad3d.part_name) || "Workpiece", positions: pBody, normals: nBody, color: steelCol }];
  }

  // ---------------------------------------------------------------------------
  // 4. Real ISO 10303-21 Demo .STEP Generator (for browser testing & download)
  // ---------------------------------------------------------------------------
  function generateDemoStepClient(demoId) {
    if (demoId === "step-flange-m1") {
      const fname = "Flanec_D120_12X18H10T.step";
      const lines = [
        "ISO-10303-21;", "HEADER;",
        "FILE_DESCRIPTION(('SKM Demo 3D Flange D120'),'2;1');",
        `FILE_NAME('${fname}','2026-11-26T12:00:00',('SKM'),('SKM CAD'),'','SKM v2.3','');`,
        "FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));", "ENDSEC;", "DATA;",
        "#1 = PRODUCT('Flanec_D120_12X18H10T','Фланец напорный Ø120 (12Х18Н10Т)','',(#2));",
        "#10 = DIRECTION('Z',(0.0,0.0,1.0));", "#11 = DIRECTION('X',(1.0,0.0,0.0));",
        "#20 = CARTESIAN_POINT('O0',(0.0,0.0,0.0));", "#21 = CARTESIAN_POINT('O1',(0.0,0.0,30.0));",
        "#22 = AXIS2_PLACEMENT_3D('A_OD',#20,#10,#11);", "#23 = AXIS2_PLACEMENT_3D('A_OD_T',#21,#10,#11);",
        "#24 = CYLINDRICAL_SURFACE('OD_120',#22,60.0);", "#25 = CIRCLE('C_OD_B',#22,60.0);", "#26 = CIRCLE('C_OD_T',#23,60.0);",
        "#27 = ADVANCED_FACE('F_OD',(#28),#24,.T.);", "#29 = PLANE('P_B',#22);", "#30 = PLANE('P_T',#23);",
        "#31 = CYLINDRICAL_SURFACE('BORE_28',#22,14.0);", "#32 = CIRCLE('C_B_B',#22,14.0);", "#33 = CIRCLE('C_B_T',#23,14.0);",
        "#34 = ADVANCED_FACE('F_BORE',(#35),#31,.F.);",
      ];
      let eid = 100;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const hx = +(44 * Math.cos(a)).toFixed(3), hy = +(44 * Math.sin(a)).toFixed(3);
        lines.push(
          `#${eid} = CARTESIAN_POINT('H${k}_B',(${hx},${hy},0.0));`,
          `#${eid + 1} = CARTESIAN_POINT('H${k}_T',(${hx},${hy},30.0));`,
          `#${eid + 2} = AXIS2_PLACEMENT_3D('AH${k}_B',#${eid},#10,#11);`,
          `#${eid + 3} = AXIS2_PLACEMENT_3D('AH${k}_T',#${eid + 1},#10,#11);`,
          `#${eid + 4} = CYLINDRICAL_SURFACE('HOLE_12_${k}',#${eid + 2},6.0);`,
          `#${eid + 5} = CIRCLE('CH${k}_B',#${eid + 2},6.0);`,
          `#${eid + 6} = CIRCLE('CH${k}_T',#${eid + 3},6.0);`,
          `#${eid + 7} = ADVANCED_FACE('FH_${k}',(#${eid + 8}),#${eid + 4},.F.);`
        );
        eid += 10;
      }
      lines.push("ENDSEC;", "END-ISO-10303-21;");
      return { filename: fname, content: lines.join("\n") + "\n", notes: "Материал: 12Х18Н10Т · Точное центральное отв. Ø28 H7 · 4 отв. M12 глуб. 24" };
    }

    if (demoId === "step-housing-n1") {
      const fname = "Korpus_140x100x45_D16T.step";
      const lines = [
        "ISO-10303-21;", "HEADER;",
        "FILE_DESCRIPTION(('SKM Demo 3D Milled Housing'),'2;1');",
        `FILE_NAME('${fname}','2026-11-26T12:00:00',('SKM'),('SKM CAD'),'','SKM v2.3','');`,
        "FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));", "ENDSEC;", "DATA;",
        "#1 = PRODUCT('Korpus_140x100x45_D16T','Корпус фрезерный 140×100×45 (Д16Т)','',(#2));",
        "#10 = DIRECTION('Z',(0.0,0.0,1.0));", "#11 = DIRECTION('X',(1.0,0.0,0.0));", "#12 = DIRECTION('Y',(0.0,1.0,0.0));",
        "#20 = CARTESIAN_POINT('V0',(0.0,0.0,0.0));", "#21 = CARTESIAN_POINT('V1',(140.0,100.0,45.0));",
        "#22 = VERTEX_POINT('VP0',#20);", "#23 = VERTEX_POINT('VP1',#21);",
        "#24 = AXIS2_PLACEMENT_3D('AZ',#20,#10,#11);", "#25 = AXIS2_PLACEMENT_3D('AX',#20,#11,#12);", "#26 = AXIS2_PLACEMENT_3D('AY',#20,#12,#10);",
        "#30 = PLANE('P1',#24); #31 = PLANE('P2',#24); #32 = PLANE('P3',#25); #33 = PLANE('P4',#25); #34 = PLANE('P5',#26); #35 = PLANE('P6',#26);",
        "#40 = CARTESIAN_POINT('CB0',(70.0,50.0,20.0));", "#41 = CARTESIAN_POINT('CB1',(70.0,50.0,45.0));",
        "#42 = AXIS2_PLACEMENT_3D('ACB0',#40,#10,#11);", "#43 = AXIS2_PLACEMENT_3D('ACB1',#41,#10,#11);",
        "#44 = CYLINDRICAL_SURFACE('BORE_32',#42,16.0);", "#45 = CIRCLE('CCB0',#42,16.0);", "#46 = CIRCLE('CCB1',#43,16.0);",
        "#47 = ADVANCED_FACE('FCB',(#48),#44,.F.);",
      ];
      let eid = 100;
      for (const [idx, [hx, hy]] of [[15, 15], [125, 15], [125, 85], [15, 85]].entries()) {
        lines.push(
          `#${eid} = CARTESIAN_POINT('H${idx}_B',(${hx}.0,${hy}.0,0.0));`,
          `#${eid + 1} = CARTESIAN_POINT('H${idx}_T',(${hx}.0,${hy}.0,45.0));`,
          `#${eid + 2} = AXIS2_PLACEMENT_3D('AH${idx}_B',#${eid},#10,#11);`,
          `#${eid + 3} = AXIS2_PLACEMENT_3D('AH${idx}_T',#${eid + 1},#10,#11);`,
          `#${eid + 4} = CYLINDRICAL_SURFACE('HOLE_10_${idx}',#${eid + 2},5.0);`,
          `#${eid + 5} = CIRCLE('CH${idx}_B',#${eid + 2},5.0);`,
          `#${eid + 6} = CIRCLE('CH${idx}_T',#${eid + 3},5.0);`,
          `#${eid + 7} = ADVANCED_FACE('FH_${idx}',(#${eid + 8}),#${eid + 4},.F.);`
        );
        eid += 10;
      }
      lines.push("ENDSEC;", "END-ISO-10303-21;");
      return { filename: fname, content: lines.join("\n") + "\n", notes: "Материал: Д16Т (алюминий) · Посадка Ø32 H7 · 8 отв. M8 глуб. 16" };
    }

    const fname = "Val_D65x160_40X.step";
    const lines = [
      "ISO-10303-21;", "HEADER;",
      "FILE_DESCRIPTION(('SKM Demo 3D Stepped Shaft D65x160'),'2;1');",
      `FILE_NAME('${fname}','2026-11-26T12:00:00',('SKM'),('SKM CAD'),'','SKM v2.3','');`,
      "FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));", "ENDSEC;", "DATA;",
      "#1 = PRODUCT('Val_D65x160_40X','Вал приводной Ø65×160 (40Х)','',(#2));",
      "#10 = DIRECTION('Z',(0.0,0.0,1.0));", "#11 = DIRECTION('X',(1.0,0.0,0.0));",
      "#20 = CARTESIAN_POINT('P0',(0.0,0.0,0.0));", "#21 = CARTESIAN_POINT('P1',(0.0,0.0,50.0));",
      "#22 = AXIS2_PLACEMENT_3D('A0',#20,#10,#11);", "#23 = AXIS2_PLACEMENT_3D('A1',#21,#10,#11);",
      "#24 = CYLINDRICAL_SURFACE('STEP_45',#22,22.5);", "#25 = CIRCLE('C45_0',#22,22.5);", "#26 = CIRCLE('C45_1',#23,22.5);",
      "#27 = ADVANCED_FACE('F_S45',(#28),#24,.T.);",
      "#30 = CARTESIAN_POINT('P2',(0.0,0.0,115.0));", "#31 = AXIS2_PLACEMENT_3D('A2',#30,#10,#11);",
      "#32 = CYLINDRICAL_SURFACE('OD_65',#23,32.5);", "#33 = CIRCLE('C65_0',#23,32.5);", "#34 = CIRCLE('C65_1',#31,32.5);",
      "#35 = ADVANCED_FACE('F_OD65',(#36),#32,.T.);",
      "#40 = CARTESIAN_POINT('P3',(0.0,0.0,119.0));", "#41 = AXIS2_PLACEMENT_3D('A3',#40,#10,#11);",
      "#42 = CYLINDRICAL_SURFACE('GRV_38',#31,19.0);", "#43 = CIRCLE('CG_0',#31,19.0);", "#44 = CIRCLE('CG_1',#41,19.0);",
      "#45 = ADVANCED_FACE('F_GRV',(#46),#42,.T.);",
      "#50 = CARTESIAN_POINT('P4',(0.0,0.0,160.0));", "#51 = AXIS2_PLACEMENT_3D('A4',#50,#10,#11);",
      "#52 = CYLINDRICAL_SURFACE('STEP_42',#41,21.0);", "#53 = CIRCLE('C42_0',#41,21.0);", "#54 = CIRCLE('C42_1',#51,21.0);",
      "#55 = ADVANCED_FACE('F_S42',(#56),#52,.T.);",
      "#60 = CARTESIAN_POINT('PH',(0.0,0.0,45.0));", "#61 = AXIS2_PLACEMENT_3D('AH',#60,#10,#11);",
      "#62 = CYLINDRICAL_SURFACE('HOLE_14',#22,7.0);", "#63 = CIRCLE('CH_0',#22,7.0);", "#64 = CIRCLE('CH_1',#61,7.0);",
      "#65 = ADVANCED_FACE('F_HOLE',(#66),#62,.F.);",
      "ENDSEC;", "END-ISO-10303-21;",
    ];
    return { filename: fname, content: lines.join("\n") + "\n", notes: "Материал: Сталь 40Х · Наружная резьба M20x1.5 на валу · Ra 1.6" };
  }

  global.parseStepWorkpieceClient = parseStepWorkpieceClient;
  global.parseStlWorkpieceClient = parseStlWorkpieceClient;
  global.buildProceduralWorkpieceParts = buildProceduralWorkpieceParts;
  global.generateDemoStepClient = generateDemoStepClient;
})(window);
