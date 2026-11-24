/**
 * SKM 3D Viewport — Parametric ISO 1832 Insert Renderer + In-Browser STEP / IGES / BREP / STL Viewer.
 *
 * Engine hierarchy:
 *  1. WebGL PBR renderer via Three.js (loaded lazily from jsDelivr ESM CDN).
 *  2. Automatic Canvas 2D Z-sorted software 3D fallback for air-gapped offline shop-floor PCs.
 *  3. Native Binary/ASCII STL parser (works 100% offline) + lazy OpenCASCADE WASM (`occt-import-js`)
 *     for STEP (.stp/.step), IGES (.igs/.iges), and BREP (.brep) CAD files.
 */

(function (global) {
  "use strict";

  const OCCT_CDN_BASE = "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.22/dist/";

  // ---------------------------------------------------------------------------
  // 1. Client-side Parametric ISO 1832 3D Mesh Builder (mirrors app/geometry3d.py)
  // ---------------------------------------------------------------------------
  function norm2(x, y) {
    const l = Math.hypot(x, y);
    return l < 1e-9 ? [1, 0] : [x / l, y / l];
  }

  function rawPolygon2D(shape, ic, length) {
    const r = ic / 2;
    if (shape === "C" || shape === "D" || shape === "V") {
      const deg = shape === "C" ? 80 : shape === "D" ? 55 : 35;
      const half = (deg * Math.PI) / 360;
      const a = r / Math.sin(half);
      const b = r / Math.cos(half);
      return [[a, 0], [0, b], [-a, 0], [0, -b]];
    }
    if (shape === "S") return [[r, r], [-r, r], [-r, -r], [r, -r]];
    if (shape === "T") {
      const rv = 2 * r;
      return [0, 1, 2].map((k) => {
        const a = ((90 + 120 * k) * Math.PI) / 180;
        return [rv * Math.cos(a), rv * Math.sin(a)];
      });
    }
    if (shape === "W") {
      const rCut = r / Math.sin((40 * Math.PI) / 180);
      const rObt = r / Math.sin((80 * Math.PI) / 180);
      const pts = [];
      for (let k = 0; k < 3; k++) {
        const a1 = ((90 + 120 * k) * Math.PI) / 180;
        const a2 = ((150 + 120 * k) * Math.PI) / 180;
        pts.push([rCut * Math.cos(a1), rCut * Math.sin(a1)]);
        pts.push([rObt * Math.cos(a2), rObt * Math.sin(a2)]);
      }
      return pts;
    }
    if (shape === "A") {
      const hHalf = Math.max(length || ic * 1.3, ic * 1.1) / 2;
      const skew = hHalf / Math.tan((85 * Math.PI) / 180);
      return [
        [r + skew, hHalf],
        [-r + skew, hHalf],
        [-r - skew, -hHalf],
        [r - skew, -hHalf],
      ];
    }
    if (shape === "L") {
      const hHalf = Math.max(length || ic * 1.3, ic * 1.1) / 2;
      return [[r, hHalf], [-r, hHalf], [-r, -hHalf], [r, -hHalf]];
    }
    if (shape === "P" || shape === "H" || shape === "O") {
      const n = shape === "P" ? 5 : shape === "H" ? 6 : 8;
      const rv = r / Math.cos(Math.PI / n);
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (2 * Math.PI * k) / n;
        pts.push([rv * Math.cos(a), rv * Math.sin(a)]);
      }
      return pts;
    }
    const pts = [];
    const nSeg = 64;
    for (let k = 0; k < nSeg; k++) {
      const a = (2 * Math.PI * k) / nSeg;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return pts;
  }

  function filletPolygon2D(verts, radius, arcSteps = 8) {
    const n = verts.length;
    if (radius <= 1e-4 || n > 12) return verts;
    const out = [];
    for (let i = 0; i < n; i++) {
      const pPrev = verts[(i - 1 + n) % n];
      const pCurr = verts[i];
      const pNext = verts[(i + 1) % n];
      const v1x = pPrev[0] - pCurr[0], v1y = pPrev[1] - pCurr[1];
      const v2x = pNext[0] - pCurr[0], v2y = pNext[1] - pCurr[1];
      const len1 = Math.hypot(v1x, v1y), len2 = Math.hypot(v2x, v2y);
      const u1x = v1x / len1, u1y = v1y / len1;
      const u2x = v2x / len2, u2y = v2y / len2;
      const dot = Math.max(-0.9999, Math.min(0.9999, u1x * u2x + u1y * u2y));
      const halfAngle = Math.acos(dot) / 2;
      const tanHalf = Math.tan(halfAngle);
      if (tanHalf < 1e-4) {
        out.push(pCurr);
        continue;
      }
      const maxDist = Math.min(len1, len2) * 0.42;
      let dist = radius / tanHalf;
      let effR = radius;
      if (dist > maxDist) {
        dist = maxDist;
        effR = dist * tanHalf;
      }
      const t1x = pCurr[0] + u1x * dist, t1y = pCurr[1] + u1y * dist;
      const t2x = pCurr[0] + u2x * dist, t2y = pCurr[1] + u2y * dist;
      const [bx, by] = norm2(u1x + u2x, u1y + u2y);
      const cDist = effR / Math.max(Math.sin(halfAngle), 1e-4);
      const cx = pCurr[0] + bx * cDist, cy = pCurr[1] + by * cDist;
      const a1 = Math.atan2(t1y - cy, t1x - cx);
      const a2 = Math.atan2(t2y - cy, t2x - cx);
      let delta = a2 - a1;
      while (delta <= -Math.PI) delta += 2 * Math.PI;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      for (let s = 0; s <= arcSteps; s++) {
        const ang = a1 + delta * (s / arcSteps);
        out.push([cx + effR * Math.cos(ang), cy + effR * Math.sin(ang)]);
      }
    }
    return out;
  }

  function insetLoop2D(pts, insetMm) {
    if (insetMm <= 1e-5) return pts.slice();
    const n = pts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const pPrev = pts[(i - 1 + n) % n];
      const pCurr = pts[i];
      const pNext = pts[(i + 1) % n];
      const [e1x, e1y] = norm2(pCurr[0] - pPrev[0], pCurr[1] - pPrev[1]);
      const [e2x, e2y] = norm2(pNext[0] - pCurr[0], pNext[1] - pCurr[1]);
      const n1x = -e1y, n1y = e1x;
      const n2x = -e2y, n2y = e2x;
      const mx = n1x + n2x, my = n1y + n2y;
      const mLen = Math.hypot(mx, my);
      let nx, ny, scale;
      if (mLen < 1e-5) {
        nx = n1x; ny = n1y; scale = insetMm;
      } else {
        nx = mx / mLen; ny = my / mLen;
        const cosH = Math.max(nx * n1x + ny * n1y, 0.35);
        scale = Math.min(insetMm / cosH, insetMm * 2.2);
      }
      out.push([pCurr[0] + nx * scale, pCurr[1] + ny * scale]);
    }
    return out;
  }

  function pushTri(pos, nrm, a, b, c) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const mag = Math.hypot(nx, ny, nz) || 1;
    nx /= mag; ny /= mag; nz /= mag;
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }

  function buildIso1832MeshClient(parsed) {
    const shape = parsed.shape_code || "C";
    const ic = parsed.ic_mm || 12.7;
    const s = parsed.thickness_mm || 4.76;
    const reMm = parsed.corner_radius_mm || 0.4;
    const alphaDeg = parsed.clearance_angle_deg != null ? parsed.clearance_angle_deg : 0;
    const fixing = parsed.fixing_type_code || (parsed.seat_pocket_signature ? parsed.seat_pocket_signature.slice(-1) : "G");
    const lenMm = parsed.cutting_edge_length_mm || ic;

    const hasHole = fixing !== "N";
    const hasCs = fixing === "T" || fixing === "W";
    const holeD = hasHole ? +(ic * 0.40).toFixed(2) : 0;
    const holeR = holeD / 2;
    const csR = hasCs ? Math.min(holeR * 1.34, ic * 0.34) : holeR;

    const rawPoly = rawPolygon2D(shape, ic, lenMm);
    const insetMm = Math.min(s * Math.tan((alphaDeg * Math.PI) / 180), ic * 0.22);
    let topOuter, botOuter;
    if (shape === "R") {
      topOuter = rawPoly;
      const sc = Math.max(0.35, (ic / 2 - insetMm) / (ic / 2));
      botOuter = rawPoly.map((p) => [p[0] * sc, p[1] * sc]);
    } else {
      topOuter = filletPolygon2D(rawPoly, reMm, 8);
      const rawBot = insetLoop2D(rawPoly, insetMm);
      botOuter = filletPolygon2D(rawBot, Math.max(0.08, reMm - insetMm * 0.5), 8);
    }

    const n = topOuter.length;
    const zTop = s / 2, zMid = s * 0.05, zBot = -s / 2;
    const positions = [], normals = [];

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const t0 = [topOuter[i][0], topOuter[i][1], zTop];
      const t1 = [topOuter[j][0], topOuter[j][1], zTop];
      const b0 = [botOuter[i][0], botOuter[i][1], zBot];
      const b1 = [botOuter[j][0], botOuter[j][1], zBot];
      pushTri(positions, normals, b0, b1, t1);
      pushTri(positions, normals, b0, t1, t0);
    }

    if (hasHole) {
      const angles = topOuter.map((p) => Math.atan2(p[1], p[0]));
      const topIn = angles.map((a) => [csR * Math.cos(a), csR * Math.sin(a)]);
      const midIn = angles.map((a) => [holeR * Math.cos(a), holeR * Math.sin(a)]);
      const botIn = angles.map((a) => [holeR * Math.cos(a), holeR * Math.sin(a)]);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const to0 = [topOuter[i][0], topOuter[i][1], zTop];
        const to1 = [topOuter[j][0], topOuter[j][1], zTop];
        const ti0 = [topIn[i][0], topIn[i][1], zTop];
        const ti1 = [topIn[j][0], topIn[j][1], zTop];
        pushTri(positions, normals, ti0, to0, to1);
        pushTri(positions, normals, ti0, to1, ti1);

        const bo0 = [botOuter[i][0], botOuter[i][1], zBot];
        const bo1 = [botOuter[j][0], botOuter[j][1], zBot];
        const bi0 = [botIn[i][0], botIn[i][1], zBot];
        const bi1 = [botIn[j][0], botIn[j][1], zBot];
        pushTri(positions, normals, bo0, bi0, bi1);
        pushTri(positions, normals, bo0, bi1, bo1);

        if (hasCs) {
          const mi0 = [midIn[i][0], midIn[i][1], zMid];
          const mi1 = [midIn[j][0], midIn[j][1], zMid];
          pushTri(positions, normals, ti0, ti1, mi1);
          pushTri(positions, normals, ti0, mi1, mi0);
          pushTri(positions, normals, mi0, mi1, bi1);
          pushTri(positions, normals, mi0, bi1, bi0);
        } else {
          pushTri(positions, normals, ti0, ti1, bi1);
          pushTri(positions, normals, ti0, bi1, bi0);
        }
      }
    } else {
      const cT = [0, 0, zTop], cB = [0, 0, zBot];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        pushTri(positions, normals, cT, [topOuter[i][0], topOuter[i][1], zTop], [topOuter[j][0], topOuter[j][1], zTop]);
        pushTri(positions, normals, cB, [botOuter[j][0], botOuter[j][1], zBot], [botOuter[i][0], botOuter[i][1], zBot]);
      }
    }

    return {
      iso_code: parsed.raw_code || parsed.iso_code || "ISO",
      shape_code: shape,
      ic_mm: ic,
      thickness_mm: s,
      corner_radius_mm: reMm,
      clearance_angle_deg: alphaDeg,
      has_hole: hasHole,
      has_countersink: hasCs,
      hole_diameter_mm: holeD,
      bbox_mm: computeBBox(positions),
      triangle_count: positions.length / 9,
      positions,
      normals,
    };
  }

  function computeBBox(positions) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    if (!isFinite(minX)) return { x: 0, y: 0, z: 0 };
    return {
      x: +(maxX - minX).toFixed(2),
      y: +(maxY - minY).toFixed(2),
      z: +(maxZ - minZ).toFixed(2),
    };
  }

  function meshToAsciiSTL(name, positions, normals) {
    const safe = (name || "insert").replace(/[^A-Za-z0-9_]/g, "");
    const lines = [`solid ${safe}`];
    const tris = Math.floor(positions.length / 9);
    for (let t = 0; t < tris; t++) {
      const b = t * 9;
      const nx = normals[b] || 0, ny = normals[b + 1] || 0, nz = normals[b + 2] || 1;
      lines.push(`  facet normal ${nx.toFixed(5)} ${ny.toFixed(5)} ${nz.toFixed(5)}`);
      lines.push("    outer loop");
      lines.push(`      vertex ${positions[b].toFixed(4)} ${positions[b + 1].toFixed(4)} ${positions[b + 2].toFixed(4)}`);
      lines.push(`      vertex ${positions[b + 3].toFixed(4)} ${positions[b + 4].toFixed(4)} ${positions[b + 5].toFixed(4)}`);
      lines.push(`      vertex ${positions[b + 6].toFixed(4)} ${positions[b + 7].toFixed(4)} ${positions[b + 8].toFixed(4)}`);
      lines.push("    endloop");
      lines.push("  endfacet");
    }
    lines.push(`endsolid ${safe}`);
    return lines.join("\n") + "\n";
  }

  // ---------------------------------------------------------------------------
  // 2. Native Binary & ASCII STL Parser (works 100% offline)
  // ---------------------------------------------------------------------------
  function parseSTLBuffer(buffer) {
    const view = new DataView(buffer);
    const byteLen = buffer.byteLength;
    let isBinary = false;
    if (byteLen >= 84) {
      const triCount = view.getUint32(80, true);
      if (84 + triCount * 50 === byteLen) isBinary = true;
    }

    const positions = [];
    const normals = [];

    if (isBinary) {
      const triCount = view.getUint32(80, true);
      let off = 84;
      for (let i = 0; i < triCount; i++) {
        const nx = view.getFloat32(off, true);
        const ny = view.getFloat32(off + 4, true);
        const nz = view.getFloat32(off + 8, true);
        off += 12;
        for (let v = 0; v < 3; v++) {
          positions.push(
            view.getFloat32(off, true),
            view.getFloat32(off + 4, true),
            view.getFloat32(off + 8, true)
          );
          normals.push(nx, ny, nz);
          off += 12;
        }
        off += 2;
      }
    } else {
      const text = new TextDecoder("utf-8").decode(buffer);
      const regex = /facet\s+normal\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)[\s\S]*?vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)[\s\S]*?vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)[\s\S]*?vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi;
      let m;
      while ((m = regex.exec(text)) !== null) {
        const nx = parseFloat(m[1]) || 0, ny = parseFloat(m[2]) || 0, nz = parseFloat(m[3]) || 1;
        for (let k = 0; k < 3; k++) {
          positions.push(parseFloat(m[4 + k * 3]), parseFloat(m[5 + k * 3]), parseFloat(m[6 + k * 3]));
          normals.push(nx, ny, nz);
        }
      }
    }

    if (!positions.length) throw new Error("Файл STL не содержит треугольников.");
    return [{ name: "STL Model", positions, normals, color: [0.68, 0.76, 0.86] }];
  }

  // ---------------------------------------------------------------------------
  // 3. Lazy OpenCASCADE WASM Loader (`occt-import-js`) for STEP / IGES / BREP
  // ---------------------------------------------------------------------------
  let occtPromise = null;

  function loadOcct() {
    if (occtPromise) return occtPromise;
    occtPromise = new Promise((resolve, reject) => {
      if (typeof global.occtimportjs === "function") {
        global.occtimportjs({ locateFile: (f) => OCCT_CDN_BASE + f }).then(resolve, reject);
        return;
      }
      const script = document.createElement("script");
      script.src = OCCT_CDN_BASE + "occt-import-js.js";
      script.async = true;
      script.onload = () => {
        if (typeof global.occtimportjs !== "function") {
          reject(new Error("occt-import-js не инициализировался."));
          return;
        }
        global.occtimportjs({ locateFile: (f) => OCCT_CDN_BASE + f }).then(resolve, reject);
      };
      script.onerror = () => reject(new Error("Не удалось загрузить OpenCASCADE WASM с CDN (требуется доступ в интернет для STEP/IGES)."));
      document.head.appendChild(script);
    });
    return occtPromise;
  }

  async function parseCadWithOcct(buffer, ext) {
    const occt = await loadOcct();
    const bytes = new Uint8Array(buffer);
    const params = { linearUnit: "millimeter", linearDeflectionType: "bounding_box_ratio", linearDeflection: 0.002, angularDeflection: 0.35 };
    let res;
    if (ext === "step" || ext === "stp") res = occt.ReadStepFile(bytes, params);
    else if (ext === "iges" || ext === "igs") res = occt.ReadIgesFile(bytes, params);
    else if (ext === "brep") res = occt.ReadBrepFile(bytes, params);
    else throw new Error(`Неподдерживаемый CAD-формат: .${ext}`);

    if (!res || !res.success || !res.meshes || !res.meshes.length) {
      throw new Error("Не удалось извлечь 3D-геометрию из CAD-файла.");
    }

    const parts = [];
    for (const m of res.meshes) {
      const idx = m.index?.array || [];
      const rawPos = m.attributes?.position?.array || [];
      const rawNrm = m.attributes?.normal?.array || [];
      const positions = [];
      const normals = [];
      for (let i = 0; i < idx.length; i++) {
        const vi = idx[i] * 3;
        positions.push(rawPos[vi], rawPos[vi + 1], rawPos[vi + 2]);
        if (rawNrm.length > vi + 2) {
          normals.push(rawNrm[vi], rawNrm[vi + 1], rawNrm[vi + 2]);
        } else {
          normals.push(0, 0, 1);
        }
      }
      const color = m.color && m.color.length >= 3 ? m.color : [0.76, 0.65, 0.35];
      parts.push({ name: m.name || "CAD Part", positions, normals, color });
    }
    return parts;
  }

  // ---------------------------------------------------------------------------
  // 4. Coating-to-PBR Appearance Mapping
  // ---------------------------------------------------------------------------
  function coatingMaterialSpec(coatingMethod, coatingComp) {
    const comp = (coatingComp || "").toUpperCase();
    const method = (coatingMethod || "CVD").toUpperCase();
    if (comp.includes("CBN")) return { hex: 0x353b45, css: "#4b5563", metalness: 0.65, roughness: 0.36, label: "CBN (графит)" };
    if (method === "UNCOATED" || comp.includes("POLISHED")) return { hex: 0xd4dde8, css: "#cbd5e1", metalness: 0.90, roughness: 0.16, label: "Полированный твёрдый сплав" };
    if (method === "PVD" && comp.includes("S")) return { hex: 0x8b6f4e, css: "#a1805a", metalness: 0.74, roughness: 0.28, label: "PVD TiAlSiN (бронза)" };
    if (method === "PVD") return { hex: 0x524c66, css: "#6d658a", metalness: 0.72, roughness: 0.28, label: "PVD AlTiN (антрацит)" };
    return { hex: 0xd9ad45, css: "#d9ad45", metalness: 0.78, roughness: 0.25, label: "CVD TiN / Al2O3 (золото)" };
  }

  // ---------------------------------------------------------------------------
  // 5. Main Viewer Controller (Three.js WebGL + Software Canvas 2D Fallback)
  // ---------------------------------------------------------------------------
  class SKMViewer3D {
    constructor(opts) {
      this.mountEl = document.getElementById(opts.mountId);
      this.infoEl = document.getElementById(opts.infoId);
      this.statusEl = document.getElementById(opts.statusId);
      this.mode = "init"; // "webgl" | "software"
      this.wireframe = false;
      this.showAxes = true;
      this.isCadFileLoaded = false;
      this.currentParts = [];
      this.currentLabel = "CNMG 120408";
      this.currentCoating = { method: "CVD", comp: "TiCN-Al2O3-TiN" };

      // Software fallback state
      this.swCanvas = null;
      this.swCtx = null;
      this.swYaw = 0.65;
      this.swPitch = 0.72;
      this.swZoom = 1.0;
      this.swDragging = false;
      this.swLast = [0, 0];

      // Three.js state
      this.THREE = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.modelGroup = null;
      this.axesHelper = null;
      this.gridHelper = null;
      this.animId = null;
    }

    async init() {
      try {
        const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/+esm");
        const { OrbitControls } = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js/+esm");
        this._initThree(THREE, OrbitControls);
        this.mode = "webgl";
        this._setStatus("WebGL · Three.js PBR");
      } catch (err) {
        this._initSoftwareCanvas();
        this.mode = "software";
        this._setStatus("Offline 3D (Canvas)");
      }
    }

    _setStatus(text) {
      if (this.statusEl) this.statusEl.textContent = text;
    }

    _initThree(THREE, OrbitControls) {
      this.THREE = THREE;
      this.mountEl.innerHTML = "";
      const w = this.mountEl.clientWidth || 500;
      const h = this.mountEl.clientHeight || 300;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0b111a);

      this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 5000);
      this.camera.position.set(22, 18, 22);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(w, h);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.mountEl.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;

      // Studio 3-point lighting for metallic carbide highlights
      this.scene.add(new THREE.AmbientLight(0xdbeafe, 0.65));
      const key = new THREE.DirectionalLight(0xffffff, 1.45);
      key.position.set(30, 45, 35);
      this.scene.add(key);
      const fill = new THREE.DirectionalLight(0x7dd3fc, 0.75);
      fill.position.set(-35, 20, -25);
      this.scene.add(fill);
      const rim = new THREE.DirectionalLight(0xfde68a, 0.55);
      rim.position.set(0, -30, 15);
      this.scene.add(rim);

      this.gridHelper = new THREE.GridHelper(60, 24, 0x253449, 0x162131);
      this.gridHelper.position.y = -3;
      this.scene.add(this.gridHelper);

      this.axesHelper = new THREE.AxesHelper(14);
      this.scene.add(this.axesHelper);

      this.modelGroup = new THREE.Group();
      this.scene.add(this.modelGroup);

      const resizeObs = new ResizeObserver(() => {
        if (!this.renderer || !this.mountEl) return;
        const nw = this.mountEl.clientWidth || 500;
        const nh = this.mountEl.clientHeight || 300;
        this.camera.aspect = nw / nh;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(nw, nh);
      });
      resizeObs.observe(this.mountEl);

      const animate = () => {
        this.animId = requestAnimationFrame(animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      animate();
    }

    _initSoftwareCanvas() {
      this.mountEl.innerHTML = "";
      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.cursor = "grab";
      this.mountEl.appendChild(canvas);
      this.swCanvas = canvas;
      this.swCtx = canvas.getContext("2d");

      canvas.addEventListener("mousedown", (e) => {
        this.swDragging = true;
        this.swLast = [e.clientX, e.clientY];
        canvas.style.cursor = "grabbing";
      });
      window.addEventListener("mouseup", () => {
        this.swDragging = false;
        if (this.swCanvas) this.swCanvas.style.cursor = "grab";
      });
      window.addEventListener("mousemove", (e) => {
        if (!this.swDragging) return;
        const dx = e.clientX - this.swLast[0];
        const dy = e.clientY - this.swLast[1];
        this.swLast = [e.clientX, e.clientY];
        this.swYaw += dx * 0.012;
        this.swPitch = Math.max(-1.45, Math.min(1.45, this.swPitch + dy * 0.012));
        this._renderSoftware();
      });
      canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        this.swZoom = Math.max(0.35, Math.min(3.5, this.swZoom * (e.deltaY > 0 ? 0.9 : 1.1)));
        this._renderSoftware();
      }, { passive: false });

      new ResizeObserver(() => this._renderSoftware()).observe(this.mountEl);
    }

    setParts(parts, metaLabel, coatingMethod, coatingComp, isCadFile = false) {
      this.currentParts = parts;
      this.currentLabel = metaLabel;
      this.currentCoating = { method: coatingMethod, comp: coatingComp };
      this.isCadFileLoaded = isCadFile;

      // Aggregate global bbox & triangle count
      let totalTris = 0;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const p of parts) {
        totalTris += Math.floor(p.positions.length / 9);
        for (let i = 0; i < p.positions.length; i += 3) {
          const x = p.positions[i], y = p.positions[i + 1], z = p.positions[i + 2];
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
      }
      const dx = isFinite(minX) ? +(maxX - minX).toFixed(2) : 0;
      const dy = isFinite(minY) ? +(maxY - minY).toFixed(2) : 0;
      const dz = isFinite(minZ) ? +(maxZ - minZ).toFixed(2) : 0;
      const cx = (minX + maxX) / 2 || 0;
      const cy = (minY + maxY) / 2 || 0;
      const cz = (minZ + maxZ) / 2 || 0;
      const maxDim = Math.max(dx, dy, dz, 5);

      const matSpec = coatingMaterialSpec(coatingMethod, coatingComp);
      if (this.infoEl) {
        this.infoEl.innerHTML =
          `<b>${metaLabel}</b> · Габариты: <b>${dx} × ${dy} × ${dz} мм</b> · ` +
          `Треугольников: <b>${totalTris}</b>` +
          (isCadFile ? ` · <span style="color:#38bdf8">CAD-файл</span>` : ` · ${matSpec.label}`);
      }

      if (this.mode === "webgl") {
        this._loadPartsThree(parts, cx, cy, cz, maxDim, matSpec, isCadFile);
      } else {
        this._swCenter = [cx, cy, cz];
        this._swMaxDim = maxDim;
        this._renderSoftware();
      }
    }

    _loadPartsThree(parts, cx, cy, cz, maxDim, matSpec, isCadFile) {
      const THREE = this.THREE;
      while (this.modelGroup.children.length) {
        const ch = this.modelGroup.children.pop();
        ch.geometry?.dispose?.();
        ch.material?.dispose?.();
      }

      for (const p of parts) {
        const geom = new THREE.BufferGeometry();
        // Rotate Z-up ISO/CAD coordinates into Three.js Y-up (x, z, -y) for intuitive turntable orbit
        const nVerts = p.positions.length / 3;
        const posArr = new Float32Array(p.positions.length);
        const nrmArr = new Float32Array(p.normals.length);
        for (let i = 0; i < nVerts; i++) {
          const k = i * 3;
          posArr[k] = p.positions[k] - cx;
          posArr[k + 1] = p.positions[k + 2] - cz;
          posArr[k + 2] = -(p.positions[k + 1] - cy);
          nrmArr[k] = p.normals[k] || 0;
          nrmArr[k + 1] = p.normals[k + 2] || 1;
          nrmArr[k + 2] = -(p.normals[k + 1] || 0);
        }
        geom.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
        geom.setAttribute("normal", new THREE.BufferAttribute(nrmArr, 3));
        if (!p.normals || p.normals.length !== p.positions.length) geom.computeVertexNormals();

        const colorVal = isCadFile && p.color
          ? new THREE.Color(p.color[0], p.color[1], p.color[2])
          : new THREE.Color(matSpec.hex);

        const mat = new THREE.MeshStandardMaterial({
          color: colorVal,
          metalness: isCadFile ? 0.55 : matSpec.metalness,
          roughness: isCadFile ? 0.35 : matSpec.roughness,
          wireframe: this.wireframe,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geom, mat);
        this.modelGroup.add(mesh);

        // Sharp CAD edge overlay (skip for very heavy STEP files > 15k tris to keep 60fps)
        if (!this.wireframe && nVerts < 45000) {
          const edges = new THREE.EdgesGeometry(geom, 28);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.55 })
          );
          this.modelGroup.add(line);
        }
      }

      if (this.gridHelper) this.gridHelper.position.y = -maxDim * 0.35;
      this.setView("iso", maxDim);
    }

    _renderSoftware() {
      if (!this.swCanvas || !this.swCtx || !this.currentParts.length) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.mountEl.clientWidth || 500;
      const h = this.mountEl.clientHeight || 300;
      this.swCanvas.width = w * dpr;
      this.swCanvas.height = h * dpr;
      const ctx = this.swCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b111a";
      ctx.fillRect(0, 0, w, h);

      const [cx, cy, cz] = this._swCenter || [0, 0, 0];
      const maxDim = this._swMaxDim || 15;
      const scale = (Math.min(w, h) * 0.56 * this.swZoom) / maxDim;
      const cosY = Math.cos(this.swYaw), sinY = Math.sin(this.swYaw);
      const cosP = Math.cos(this.swPitch), sinP = Math.sin(this.swPitch);

      const proj = (x, y, z) => {
        const rx = x - cx, ry = z - cz, rz = -(y - cy);
        const x1 = rx * cosY - rz * sinY;
        const z1 = rx * sinY + rz * cosY;
        const y2 = ry * cosP - z1 * sinP;
        const z2 = ry * sinP + z1 * cosP;
        return [w / 2 + x1 * scale, h / 2 - y2 * scale, z2];
      };

      const matSpec = coatingMaterialSpec(this.currentCoating.method, this.currentCoating.comp);
      const baseRgb = [
        (matSpec.hex >> 16) & 255,
        (matSpec.hex >> 8) & 255,
        matSpec.hex & 255,
      ];
      const tris = [];
      for (const p of this.currentParts) {
        const pos = p.positions;
        const nrm = p.normals;
        const count = Math.floor(pos.length / 9);
        for (let t = 0; t < count; t++) {
          const b = t * 9;
          const p0 = proj(pos[b], pos[b + 1], pos[b + 2]);
          const p1 = proj(pos[b + 3], pos[b + 4], pos[b + 5]);
          const p2 = proj(pos[b + 6], pos[b + 7], pos[b + 8]);
          // Rotate normal for directional light shading
          const nx = nrm[b] || 0, ny = nrm[b + 2] || 1, nz = -(nrm[b + 1] || 0);
          const nx1 = nx * cosY - nz * sinY;
          const nz1 = nx * sinY + nz * cosY;
          const ny2 = ny * cosP - nz1 * sinP;
          const nz2 = ny * sinP + nz1 * cosP;
          const light = Math.max(0.22, Math.min(1.0, 0.35 + Math.abs(nx1 * 0.4 + ny2 * 0.7 + nz2 * 0.55) * 0.7));
          tris.push({ p0, p1, p2, zAvg: (p0[2] + p1[2] + p2[2]) / 3, light });
        }
      }

      tris.sort((a, b) => a.zAvg - b.zAvg);
      for (const t of tris) {
        ctx.beginPath();
        ctx.moveTo(t.p0[0], t.p0[1]);
        ctx.lineTo(t.p1[0], t.p1[1]);
        ctx.lineTo(t.p2[0], t.p2[1]);
        ctx.closePath();
        if (this.wireframe) {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 0.7;
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgb(${Math.round(baseRgb[0] * t.light)},${Math.round(baseRgb[1] * t.light)},${Math.round(baseRgb[2] * t.light)})`;
          ctx.fill();
        }
      }
    }

    setView(preset, customDim) {
      const d = (customDim || this._swMaxDim || 18) * 1.85;
      if (this.mode === "webgl" && this.camera && this.controls) {
        if (preset === "top") this.camera.position.set(0.01, d * 1.15, 0.01);
        else if (preset === "side") this.camera.position.set(d * 1.15, d * 0.12, 0.01);
        else this.camera.position.set(d * 0.75, d * 0.65, d * 0.75);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      } else {
        if (preset === "top") { this.swYaw = 0; this.swPitch = 1.44; }
        else if (preset === "side") { this.swYaw = 0; this.swPitch = 0.08; }
        else { this.swYaw = 0.65; this.swPitch = 0.72; }
        this.swZoom = 1.0;
        this._renderSoftware();
      }
    }

    toggleWireframe() {
      this.wireframe = !this.wireframe;
      if (this.mode === "webgl" && this.modelGroup) {
        this.modelGroup.children.forEach((ch) => {
          if (ch.isMesh && ch.material) ch.material.wireframe = this.wireframe;
          if (ch.isLineSegments) ch.visible = !this.wireframe;
        });
      } else {
        this._renderSoftware();
      }
      return this.wireframe;
    }

    toggleAxes() {
      this.showAxes = !this.showAxes;
      if (this.axesHelper) this.axesHelper.visible = this.showAxes;
      if (this.gridHelper) this.gridHelper.visible = this.showAxes;
      return this.showAxes;
    }

    async loadIso1832(code, parsedFallback, coatingMethod, coatingComp, apiLive, apiBase) {
      let meshData = null;
      if (apiLive) {
        try {
          const r = await fetch(`${apiBase}/api/geometry/iso1832?code=${encodeURIComponent(code)}`);
          if (r.ok) meshData = await r.json();
        } catch {}
      }
      if (!meshData) {
        if (!parsedFallback || !parsedFallback.valid) return;
        meshData = buildIso1832MeshClient(parsedFallback);
      }
      const label = `${code.toUpperCase()} (α=${meshData.clearance_angle_deg}° · S=${meshData.thickness_mm} мм)`;
      this.setParts(
        [{ name: code, positions: meshData.positions, normals: meshData.normals }],
        label,
        coatingMethod,
        coatingComp,
        false
      );
    }

    async loadCadFile(file) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const buffer = await file.arrayBuffer();
      this._setStatus(`Загрузка ${file.name}...`);
      let parts;
      if (ext === "stl") {
        parts = parseSTLBuffer(buffer);
      } else if (["step", "stp", "iges", "igs", "brep"].includes(ext)) {
        parts = await parseCadWithOcct(buffer, ext);
      } else {
        throw new Error(`Формат .${ext} не поддерживается. Используйте STEP (.stp/.step), IGES (.igs), BREP или STL.`);
      }
      this._setStatus(this.mode === "webgl" ? "WebGL · CAD Model" : "Offline 3D · CAD");
      this.setParts(parts, file.name, "UNCOATED", "", true);
    }

    downloadCurrentSTL(code, apiLive, apiBase) {
      if (!this.isCadFileLoaded && apiLive && code) {
        window.location.href = `${apiBase}/api/geometry/iso1832/stl?code=${encodeURIComponent(code)}`;
        return;
      }
      if (!this.currentParts.length) return;
      const p = this.currentParts[0];
      const stl = meshToAsciiSTL(code || p.name, p.positions, p.normals);
      const blob = new Blob([stl], { type: "model/stl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(code || "model").replace(/[^A-Za-z0-9_-]/g, "")}.stl`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  global.SKMViewer3D = SKMViewer3D;
})(window);
