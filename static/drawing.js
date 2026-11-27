/**
 * SKM v2.2 — Blueprint / Workpiece Drawing Analyzer & Tooling Kit Builder (Client + FastAPI Sync).
 * Supports DXF (with HTML5 2D CAD Blueprint Renderer), PDF (embedded preview + text extraction),
 * PNG/JPG/WEBP scans (zoomable preview + optional Gemini Vision AI), ESKD text notes, and 4 ESKD demos.
 */

(function (global) {
  "use strict";

  const GEMINI_KEY_STORAGE = "skm_gemini_vision_key_v1";

  const DRAWING_DEMOS = [
    {
      id: "demo-shaft-p1",
      title: "Вал ступенчатый Ø60 (Ст45)",
      badge: "Токарно-фрезерный · P1",
      filename: "Val_stupenchatyj_D60_St45.pdf",
      svgKind: "shaft",
      notes_text:
        "Деталь: Вал ступенчатый приводной\n" +
        "Материал: Сталь 45 ГОСТ 1050 (HB 185)\n" +
        "Наружное точение Ø60, длина L=180 мм, чистовая посадка под подшипник Ra 1.6\n" +
        "Канавка под стопорное кольцо ширина 3 мм\n" +
        "Наружная резьба M20x1.5 на валу\n" +
        "Осевое отверстие Ø12 глуб. 40 мм",
    },
    {
      id: "demo-flange-m1",
      title: "Фланец Ø120 (12Х18Н10Т · H7 + M12)",
      badge: "Нержавейка · M1",
      filename: "Flanec_D120_12X18H10T.dxf",
      svgKind: "flange",
      notes_text:
        "Деталь: Фланец напорный коррозионностойкий\n" +
        "Материал: 12Х18Н10Т (AISI 321)\n" +
        "Точение наружного диаметра Ø120, чистовой торец Ra 1.6\n" +
        "Точное центральное отверстие Ø20 H7 глуб. 35 мм\n" +
        "6 отв. Ø12 сквозные по делительной окружности\n" +
        "4 отв. M12 глуб. 24 мм глухие",
    },
    {
      id: "demo-housing-n1",
      title: "Корпус редуктора (Д16Т · фрезеровка)",
      badge: "Алюминий · N1",
      filename: "Korpus_D16T_CNC.dxf",
      svgKind: "housing",
      notes_text:
        "Деталь: Корпус приборный фрезерный\n" +
        "Материал: Д16Т (алюминий)\n" +
        "Фрезерование базовой плоскости и кармана 160x120, Ra 1.6\n" +
        "2 отв. Ø10 H7 глуб. 25 мм под штифты\n" +
        "8 отв. M8 глуб. 18 мм\n" +
        "4 отв. Ø10 сквозные",
    },
    {
      id: "demo-bushing-h1",
      title: "Втулка закалённая (Х12МФ · 54 HRC)",
      badge: "Закалённая · H1 (CBN)",
      filename: "Vtulka_X12MF_54HRC.pdf",
      svgKind: "bushing",
      notes_text:
        "Деталь: Втулка направляющая прецизионная\n" +
        "Материал: Х12МФ, закалка 52-56 HRC\n" +
        "Наружное точение Ø50, L=70 мм, чистовое Ra 0.8\n" +
        "Внутреннее точное отверстие Ø25 IT6 глуб. 55 мм\n" +
        "2 отв. M16 резьбофрезерование",
    },
  ];

  const FEATURE_KIND_LABELS = {
    EXTERNAL_ROUGH: "Наружное точение (черн./получист.)",
    EXTERNAL_FINISH: "Чистовое точение (Ra ≤ 1.6)",
    INTERNAL_BORE: "Внутреннее растачивание",
    GROOVE_PARTING: "Канавка / Отрезка",
    THREAD_EXTERNAL: "Наружная резьба резцом",
    THREAD_INTERNAL: "Резьбовое отверстие (метчик/фреза)",
    HOLE_DRILL: "Сверление отверстия",
    HOLE_PRECISION: "Точное отверстие H7 / H8 / IT6",
    FACE_MILL: "Торцевое фрезерование плоскостей",
    SHOULDER_POCKET: "Фрезерование уступов / карманов 90°",
    COPY_3D: "3D / Копировальное фрезерование",
  };

  const MATERIAL_RULES = [
    [/(?:inconel|инконель|хн77|хн73|waspaloy|никелев|жаропроч)/i, "S1", "S", "Жаропрочный сплав (Inconel / ХН77)"],
    [/(?:вт6|вт1|ti-?6al|титан)/i, "S2", "S", "Титановый сплав (ВТ6 / Ti-6Al-4V)"],
    [/(?:saf\s*2205|дуплекс|08х22н6)/i, "M2", "M", "Дуплексная нержавейка (SAF 2205)"],
    [/(?:12х18н10т|08х18н10|aisi\s*304|aisi\s*316|304l|316l|нержаве|нерж\.?)/i, "M1", "M", "Нержавеющая сталь (12Х18Н10Т)"],
    [/(?:вч\s*40|вч\s*50|вч\s*60|ggg\s*50|высокопрочн\S*\s+чугун)/i, "K2", "K", "Высокопрочный чугун (ВЧ50)"],
    [/(?:сч\s*15|сч\s*20|сч\s*25|сч\s*30|gg\s*25|чугун)/i, "K1", "K", "Серый чугун (СЧ20 / GG25)"],
    [/(?:д16т|д16|амг\d?|амц|в95|ак4|6061|7075|алюмин)/i, "N1", "N", "Алюминиевый сплав (Д16Т / 6061)"],
    [/(?:лс59|браж|бронз|латун|медь|медн)/i, "N2", "N", "Латунь / Бронза (ЛС59-1)"],
    [/(?:шх15|х12мф|5хнм|9хс|у8|у10|h13|d2)/i, "P3", "P", "Инструментальная сталь (Х12МФ / ШХ15)"],
    [/(?:40х|30хгса|38хмюа|42crmo4|4140|легирован)/i, "P2", "P", "Легированная сталь (40Х / 30ХГСА)"],
    [/(?:ст\.?\s*45|сталь\s*45|ст\.?\s*20|сталь\s*20|ст\.?\s*3|09г2с|s355|1045|сталь)/i, "P1", "P", "Конструкционная сталь (Ст45)"],
  ];

  const drawingState = {
    filename: "",
    format: "DEMO",
    analysisMethod: "ESKD_TEXT_PARSER",
    previewType: "svg", // "svg" | "image" | "pdf" | "dxf"
    previewUrl: null,
    previewSvgKind: "shaft",
    zoomPct: 100,
    dxfSummary: null,
    cad3dSummary: null,
    cad3dDemoKind: null,
    cad3dFileObj: null,
    drwViewer3d: null,
    spec: null,
    plan: null,
    lastFileBytesB64: null,
    lastFileMime: null,
    activeDemoId: "demo-shaft-p1",
    addFormOpen: false,
    visionPanelOpen: false,
  };

  // ---------------------------------------------------------------------------
  // 1. Parametric ESKD-Style SVG Technical Drawings for Instant Demo & Preview
  // ---------------------------------------------------------------------------
  function buildDemoBlueprintSVG(kind, spec) {
    const matLbl = (spec && spec.material_raw) || "Сталь 45";
    const partLbl = (spec && spec.part_name) || "Деталь по чертежу";
    const stamp = `
      <rect x="275" y="218" width="235" height="52" fill="#0d1726" stroke="#38bdf8" stroke-width="1.2"/>
      <line x1="275" y1="240" x2="510" y2="240" stroke="#38bdf8" stroke-width="0.8"/>
      <line x1="415" y1="218" x2="415" y2="270" stroke="#38bdf8" stroke-width="0.8"/>
      <text x="282" y="233" fill="#edf2f9" font-size="10.5" font-weight="700" font-family="monospace">${partLbl.slice(0, 22)}</text>
      <text x="282" y="258" fill="#7dd3fc" font-size="10" font-family="monospace">${matLbl.slice(0, 22)}</text>
      <text x="422" y="233" fill="#94a3b8" font-size="9" font-family="monospace">ЕСКД · М 1:2</text>
      <text x="422" y="258" fill="#4ade80" font-size="10" font-weight="700" font-family="monospace">ISO ${(spec && spec.material_subgroup) || "P1"}</text>
    `;

    let body = "";
    if (kind === "flange") {
      body = `
        <circle cx="150" cy="135" r="88" fill="rgba(56,189,248,0.06)" stroke="#7dd3fc" stroke-width="2"/>
        <circle cx="150" cy="135" r="62" fill="none" stroke="#38bdf8" stroke-width="0.9" stroke-dasharray="6,3"/>
        <circle cx="150" cy="135" r="24" fill="#090e17" stroke="#22c55e" stroke-width="2"/>
        <line x1="48" y1="135" x2="252" y2="135" stroke="#475569" stroke-dasharray="8,3,2,3"/>
        <line x1="150" y1="35" x2="150" y2="235" stroke="#475569" stroke-dasharray="8,3,2,3"/>
        ${[0, 60, 120, 180, 240, 300].map((a) => {
          const rad = (a * Math.PI) / 180;
          const x = 150 + 62 * Math.cos(rad);
          const y = 135 + 62 * Math.sin(rad);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="#090e17" stroke="#fbbf24" stroke-width="1.6"/>`;
        }).join("")}
        ${[45, 135, 225, 315].map((a) => {
          const rad = (a * Math.PI) / 180;
          const x = 150 + 44 * Math.cos(rad);
          const y = 135 + 44 * Math.sin(rad);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#090e17" stroke="#f472b6" stroke-width="1.5"/>
                  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8.5" fill="none" stroke="#f472b6" stroke-width="0.9" stroke-dasharray="3,2"/>`;
        }).join("")}
        <text x="262" y="54" fill="#7dd3fc" font-size="11.5" font-weight="700" font-family="monospace">Ø120 (наруж.)</text>
        <text x="262" y="80" fill="#4ade80" font-size="11.5" font-weight="700" font-family="monospace">Ø20 H7 (Ra 0.8)</text>
        <text x="262" y="106" fill="#fbbf24" font-size="11.5" font-weight="700" font-family="monospace">6 отв. Ø12 сквоз.</text>
        <text x="262" y="132" fill="#f472b6" font-size="11.5" font-weight="700" font-family="monospace">4 отв. M12 глуб. 24</text>
        <text x="262" y="160" fill="#cbd5e1" font-size="11" font-family="monospace">Торец: Ra 1.6</text>
      `;
    } else if (kind === "housing") {
      body = `
        <rect x="46" y="42" width="210" height="156" rx="6" fill="rgba(56,189,248,0.06)" stroke="#7dd3fc" stroke-width="2"/>
        <rect x="74" y="68" width="154" height="104" rx="10" fill="#0b1322" stroke="#38bdf8" stroke-width="1.6"/>
        <circle cx="96" cy="90" r="8" fill="#090e17" stroke="#22c55e" stroke-width="2"/>
        <circle cx="206" cy="150" r="8" fill="#090e17" stroke="#22c55e" stroke-width="2"/>
        ${[[60, 56], [242, 56], [60, 184], [242, 184]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#090e17" stroke="#fbbf24" stroke-width="1.6"/>`).join("")}
        ${[[112, 56], [151, 56], [190, 56], [112, 184], [151, 184], [190, 184], [60, 120], [242, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#090e17" stroke="#f472b6" stroke-width="1.4"/>`).join("")}
        <text x="275" y="58" fill="#7dd3fc" font-size="11.5" font-weight="700" font-family="monospace">Плоскость 160×120</text>
        <text x="275" y="84" fill="#38bdf8" font-size="11.5" font-weight="700" font-family="monospace">Карман 90° (Ra 1.6)</text>
        <text x="275" y="110" fill="#4ade80" font-size="11.5" font-weight="700" font-family="monospace">2 отв. Ø10 H7</text>
        <text x="275" y="136" fill="#f472b6" font-size="11.5" font-weight="700" font-family="monospace">8 отв. M8 (раскат.)</text>
        <text x="275" y="162" fill="#fbbf24" font-size="11.5" font-weight="700" font-family="monospace">4 отв. Ø10 сквоз.</text>
      `;
    } else if (kind === "bushing") {
      body = `
        <rect x="90" y="54" width="165" height="142" fill="rgba(56,189,248,0.08)" stroke="#7dd3fc" stroke-width="2"/>
        <rect x="90" y="92" width="165" height="66" fill="#090e17" stroke="#22c55e" stroke-width="2"/>
        <line x1="65" y1="125" x2="275" y2="125" stroke="#475569" stroke-dasharray="10,3,2,3"/>
        <line x1="90" y1="54" x2="255" y2="92" stroke="#38bdf8" stroke-width="0.6" opacity="0.35"/>
        <line x1="90" y1="158" x2="255" y2="196" stroke="#38bdf8" stroke-width="0.6" opacity="0.35"/>
        <text x="285" y="64" fill="#f59e0b" font-size="12" font-weight="800" font-family="monospace">HRC 52–56 (CBN)</text>
        <text x="285" y="92" fill="#7dd3fc" font-size="11.5" font-weight="700" font-family="monospace">Наруж. Ø50 (Ra 0.8)</text>
        <text x="285" y="120" fill="#4ade80" font-size="11.5" font-weight="700" font-family="monospace">Отв. Ø25 IT6 (L=55)</text>
        <text x="285" y="148" fill="#f472b6" font-size="11.5" font-weight="700" font-family="monospace">2 отв. M16 (фрез.)</text>
      `;
    } else {
      // Stepped shaft with groove, thread M20x1.5 & axial bore
      body = `
        <line x1="25" y1="120" x2="485" y2="120" stroke="#475569" stroke-dasharray="10,3,2,3"/>
        <path d="M55,82 L155,82 L155,66 L310,66 L310,88 L322,88 L322,78 L420,78 L420,162 L322,162 L322,152 L310,152 L310,174 L155,174 L155,158 L55,158 Z"
              fill="rgba(56,189,248,0.08)" stroke="#7dd3fc" stroke-width="2" stroke-linejoin="round"/>
        <rect x="55" y="106" width="84" height="28" fill="#090e17" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4,2"/>
        <line x1="365" y1="78" x2="365" y2="162" stroke="#f472b6" stroke-width="1.5" stroke-dasharray="3,2"/>
        <line x1="365" y1="84" x2="420" y2="84" stroke="#f472b6" stroke-width="1.2"/>
        <line x1="365" y1="156" x2="420" y2="156" stroke="#f472b6" stroke-width="1.2"/>
        <text x="198" y="54" fill="#7dd3fc" font-size="11.5" font-weight="700" font-family="monospace">Ø60 (Ra 1.6)</text>
        <text x="296" y="42" fill="#f59e0b" font-size="10.5" font-weight="700" font-family="monospace">Канавка 3 мм</text>
        <line x1="316" y1="47" x2="316" y2="85" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2"/>
        <text x="372" y="68" fill="#f472b6" font-size="11.5" font-weight="700" font-family="monospace">M20×1.5</text>
        <text x="54" y="196" fill="#fbbf24" font-size="11" font-weight="700" font-family="monospace">Отв. Ø12 глуб. 40</text>
        <text x="180" y="204" fill="#94a3b8" font-size="10.5" font-family="monospace">L = 180 мм</text>
      `;
    }

    return `<svg viewBox="0 0 520 280" width="100%" height="100%" style="background:#08101c;border-radius:10px;display:block;">
      <defs>
        <pattern id="bpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56,189,248,0.08)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="520" height="280" fill="url(#bpGrid)"/>
      <rect x="8" y="8" width="504" height="264" fill="none" stroke="#24344c" stroke-width="1.5"/>
      ${body}
      ${stamp}
    </svg>`;
  }

  // ---------------------------------------------------------------------------
  // 2. Client-side DXF Parser & HTML5 2D CAD Blueprint Canvas Renderer
  // ---------------------------------------------------------------------------
  function parseDxfClient(dxfText) {
    const lines = (dxfText || "").split(/\r?\n/).map((l) => l.trim());
    const entities = [];
    let inEnt = false;
    let cur = null;

    for (let i = 0; i + 1 < lines.length; i += 2) {
      const code = lines[i], val = lines[i + 1];
      if (code === "2" && val.toUpperCase() === "ENTITIES") { inEnt = true; continue; }
      if (inEnt && code === "0" && val.toUpperCase() === "ENDSEC") { if (cur) entities.push(cur); break; }
      if (!inEnt) continue;
      if (code === "0") {
        if (cur) entities.push(cur);
        cur = { type: val.toUpperCase(), xs: [], ys: [], texts: [], r: null };
        continue;
      }
      if (!cur) continue;
      if (code === "10" || code === "11") { const f = parseFloat(val); if (!isNaN(f)) cur.xs.push(f); }
      else if (code === "20" || code === "21") { const f = parseFloat(val); if (!isNaN(f)) cur.ys.push(f); }
      else if (code === "40" && (cur.type === "CIRCLE" || cur.type === "ARC")) { const f = parseFloat(val); if (!isNaN(f)) cur.r = f; }
      else if ((code === "1" || code === "3") && ["TEXT", "MTEXT", "DIMENSION", "ATTRIB"].includes(cur.type)) {
        const clean = val.replace(/\\P/g, " ").replace(/\\[A-Za-z][^;]*;/g, "").replace(/[{}]/g, "").replace(/%%[cC]/g, "Ø").replace(/%%[dD]/g, "°").trim();
        if (clean) cur.texts.push(clean);
      }
    }

    const allX = [], allY = [], circlesMap = {}, texts = [], segments = [], circlesRaw = [];
    for (const e of entities) {
      if (e.type === "CIRCLE" && e.r && e.xs.length && e.ys.length) {
        const cx = e.xs[0], cy = e.ys[0], r = e.r;
        const d = +(r * 2).toFixed(2);
        if (d >= 1.5 && d <= 300) circlesMap[d] = (circlesMap[d] || 0) + 1;
        circlesRaw.push([cx, cy, r]);
        allX.push(cx - r, cx + r); allY.push(cy - r, cy + r);
      } else if ((e.type === "LINE" || e.type === "LWPOLYLINE") && e.xs.length >= 2 && e.ys.length >= 2) {
        for (let k = 0; k < Math.min(e.xs.length, e.ys.length) - 1; k++) {
          segments.push([e.xs[k], e.ys[k], e.xs[k + 1], e.ys[k + 1]]);
        }
        allX.push(...e.xs); allY.push(...e.ys);
      } else if (e.xs.length && e.ys.length) {
        allX.push(...e.xs); allY.push(...e.ys);
      }
      texts.push(...e.texts);
    }

    const minX = allX.length ? Math.min(...allX) : 0, maxX = allX.length ? Math.max(...allX) : 100;
    const minY = allY.length ? Math.min(...allY) : 0, maxY = allY.length ? Math.max(...allY) : 100;
    return {
      entity_count: entities.length,
      bbox_w_mm: +(maxX - minX).toFixed(1),
      bbox_h_mm: +(maxY - minY).toFixed(1),
      circles_by_diameter: Object.entries(circlesMap).map(([d, c]) => ({ diameter_mm: parseFloat(d), count: c })).sort((a, b) => a.diameter_mm - b.diameter_mm),
      texts,
      preview_segments: segments.slice(0, 600),
      preview_circles: circlesRaw.slice(0, 150),
    };
  }

  function drawDxfPreviewCanvas(canvas, summary) {
    if (!canvas || !summary) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 520;
    const h = canvas.clientHeight || 280;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#08101c";
    ctx.fillRect(0, 0, w, h);

    // Subtle CAD grid
    ctx.strokeStyle = "rgba(56,189,248,0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const segs = summary.preview_segments || [];
    const circs = summary.preview_circles || [];
    const xs = [], ys = [];
    for (const s of segs) { xs.push(s[0], s[2]); ys.push(s[1], s[3]); }
    for (const c of circs) { xs.push(c[0] - c[2], c[0] + c[2]); ys.push(c[1] - c[2], c[1] + c[2]); }
    if (!xs.length) {
      ctx.fillStyle = "#7f94b0";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DXF загружен (текстовые аннотации распознаны)", w / 2, h / 2);
      return;
    }
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
    const pad = 28;
    const sc = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
    const ox = (w - spanX * sc) / 2 - minX * sc;
    const oy = h - ((h - spanY * sc) / 2) + minY * sc;
    const px = (x) => ox + x * sc;
    const py = (y) => oy - y * sc;

    // Lines & Polylines
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const s of segs) { ctx.moveTo(px(s[0]), py(s[1])); ctx.lineTo(px(s[2]), py(s[3])); }
    ctx.stroke();

    // Circles & Hole centerlines
    for (const c of circs) {
      const cx = px(c[0]), cy = py(c[1]), r = c[2] * sc;
      const d = +(c[2] * 2).toFixed(1);
      ctx.strokeStyle = d <= 40 ? "#22c55e" : "#38bdf8";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(r, 2), 0, Math.PI * 2);
      ctx.stroke();
      if (r > 6) {
        ctx.strokeStyle = "rgba(148,163,184,0.45)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - r - 4, cy); ctx.lineTo(cx + r + 4, cy);
        ctx.moveTo(cx, cy - r - 4); ctx.lineTo(cx, cy + r + 4);
        ctx.stroke();
      }
      if (d <= 40 && r > 5) {
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`Ø${d}`, cx + r + 3, cy - 3);
      }
    }

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.fillText(`DXF CAD · Габарит: ${summary.bbox_w_mm} × ${summary.bbox_h_mm} мм · Окружностей: ${circs.length}`, 12, h - 10);
  }

  // ---------------------------------------------------------------------------
  // 3. Client-side ESKD Annotation Parser & Tooling Kit Recommender (Offline-ready)
  // ---------------------------------------------------------------------------
  function detectMaterialClient(text) {
    const low = (text || "").toLowerCase();
    let hrc = null;
    let m = low.match(/(\d{2}(?:[.,]\d)?)\s*(?:[-–—.]+\s*(\d{2}(?:[.,]\d)?))?\s*hrc/i)
      || low.match(/hrc[эe]?\s*[:=]?\s*(\d{2}(?:[.,]\d)?)(?:\s*[-–—.]+\s*(\d{2}(?:[.,]\d)?))?/i);
    if (m) {
      const v1 = parseFloat(m[1].replace(",", "."));
      const v2 = m[2] ? parseFloat(m[2].replace(",", ".")) : v1;
      hrc = +((v1 + v2) / 2).toFixed(1);
    }
    let sg = "P1", grp = "P", disp = "Конструкционная сталь (Ст45)";
    for (const [rx, pSg, pGrp, pDisp] of MATERIAL_RULES) {
      if (rx.test(low)) { sg = pSg; grp = pGrp; disp = pDisp; break; }
    }
    if (hrc != null && hrc >= 45 && ["P", "K", "H"].includes(grp)) {
      sg = "H1"; grp = "H"; disp = `Закалённая сталь (${hrc} HRC)`;
    }
    return { sg, grp, disp, hrc };
  }

  function parseDrawingAnnotationsClient(text, partName, dxfSummary, batchQty, stability, includeHolders) {
    let full = (text || "").trim();
    if (dxfSummary && dxfSummary.texts && dxfSummary.texts.length) {
      full = (full + "\n" + dxfSummary.texts.join("\n")).trim();
    }
    const low = full.toLowerCase();
    const lowNoTm = low.replace(/резьбофрез/g, "");
    const { sg, grp, disp, hrc } = detectMaterialClient(full);

    const features = [];
    let seq = 1;
    const nextId = () => `feat-${seq++}`;

    const raVals = [...low.matchAll(/ra\s*[=:]?\s*(\d+(?:[.,]\d+)?)/gi)].map((x) => parseFloat(x[1].replace(",", ".")));
    const raMin = raVals.length ? Math.min(...raVals) : null;

    const hasTurningKw = /(вал|втулк|точен|токар|шкив|палец|ось|фланец|проточ|канавк|отрезк|расточ)/i.test(low);
    const hasMillingKw = /(корпус|плит|кронштейн|фрезер|карман|уступ|лыск|паз|плоскост|крышк)/i.test(lowNoTm);

    const threadMap = Object.fromEntries((FALLBACK_DB.threads || []).map((t) => [t.code.toUpperCase(), t]));
    const seenThr = new Set();
    const thrRx = /(?:(\d+)\s*(?:отв\.?|шт\.?|x|х|\*)\s*)?(?:^|[^A-Za-zА-Яа-я0-9])(?:(м|m)\s*(\d{1,2})(?:\s*[xх×]\s*(\d+(?:[.,]\d+)?))?|(g)\s*(1\/8|1\/4|3\/8|1\/2|3\/4|1)|(npt)\s*(1\/8|1\/4|3\/8|1\/2|3\/4|1))(?=$|[^A-Za-zА-Яа-я0-9])/gi;
    let m;
    while ((m = thrRx.exec(full)) !== null) {
      const cnt = m[1] ? parseInt(m[1], 10) : 1;
      let code = "", major = 12;
      if (m[2]) {
        const sz = parseInt(m[3], 10);
        if (sz < 3 || sz > 48) continue;
        const pStr = m[4] ? m[4].replace(",", ".") : null;
        code = pStr ? `M${sz}x${pStr}` : `M${sz}`;
        if (!threadMap[code.toUpperCase()]) code = `M${sz}`;
        major = sz;
      } else if (m[5]) {
        code = `G${m[6]}`;
        major = (threadMap[code.toUpperCase()] && threadMap[code.toUpperCase()].major_mm) || 21;
      } else {
        code = `NPT ${m[8]}`;
        major = (threadMap[code.toUpperCase()] && threadMap[code.toUpperCase()].major_mm) || 21.3;
      }
      const ctx = full.slice(Math.max(0, m.index - 28), Math.min(full.length, m.index + m[0].length + 28)).toLowerCase();
      let isExt = /(наруж|на валу|резцом|цапф|шпильк)/i.test(ctx);
      if (!isExt && hasTurningKw && !/(отв|внутр|глух|сквоз)/i.test(ctx) && major >= 18 && cnt === 1) isExt = true;
      const key = `${isExt ? "EXT" : "INT"}:${code.toUpperCase()}`;
      if (seenThr.has(key)) continue;
      seenThr.add(key);

      const holeType = ctx.includes("сквоз") ? "THROUGH" : "BLIND";
      const dm = ctx.match(/(?:глуб\.?|l=|h=)\s*(\d+(?:[.,]\d+)?)/i);
      const tDepth = dm ? parseFloat(dm[1].replace(",", ".")) : +(major * 1.8).toFixed(1);

      features.push({
        id: nextId(),
        kind: isExt ? "THREAD_EXTERNAL" : "THREAD_INTERNAL",
        title: isExt ? `Наружная резьба ${code}` : `Резьбовое отверстие ${code}${cnt > 1 ? ` (${cnt} отв.)` : ""}`,
        diameter_mm: major,
        length_or_depth_mm: tDepth,
        width_mm: null,
        count: cnt,
        thread_code: code.toUpperCase(),
        tolerance: null,
        ra_um: null,
        hole_type: holeType,
        notes: isExt ? "Токарное резьбонарезание 60°" : "Сверление под резьбу + метчик / резьбофреза",
        source: "AUTO",
      });
    }

    // Precision Holes (UPPERCASE H7 / H8 / H6 / IT6 only — lowercase h6/h7 is an EXTERNAL shaft!)
    const seenPrec = new Set();
    const hasShaftPrec = /(?:ø|Ø|d|D|ф|Ф)?\s*\d{1,3}(?:[.,]\d+)?\s*(?:h6|h7|g6|k6|js6|m6)\b/.test(full);
    const precRx = /(?:(\d+)\s*(?:отв\.?|шт\.?|x|х)\s*)?(?:ø|Ø|d|D|ф|Ф)?\s*(\d{1,3}(?:[.,]\d+)?)\s*(H7|H8|IT6|H6|Н7|Н8|Н6)\b/g;
    while ((m = precRx.exec(full)) !== null) {
      const cnt = m[1] ? parseInt(m[1], 10) : 1;
      const d = parseFloat(m[2].replace(",", "."));
      const rawTol = m[3].replace(/Н/g, "H").toUpperCase();
      const tol = rawTol === "H6" ? "IT6" : rawTol;
      if (d < 3 || d > 220 || seenPrec.has(d)) continue;
      seenPrec.add(d);
      features.push({
        id: nextId(),
        kind: "HOLE_PRECISION",
        title: `Точное отверстие Ø${d} ${tol}${cnt > 1 ? ` (${cnt} отв.)` : ""}`,
        diameter_mm: d,
        length_or_depth_mm: +(d * 2.2).toFixed(1),
        width_mm: null,
        count: cnt,
        thread_code: null,
        tolerance: tol,
        ra_um: tol === "H8" ? 1.6 : 0.8,
        hole_type: "BLIND",
        notes: `Чистовая обработка под квалитет ${tol}`,
        source: "AUTO",
      });
    }

    // Grooves / Parting
    const grvM = low.match(/(?:канавк\S*|проточк\S*|отрезк\S*)(?:\s*(?:шир\.?|b=|w=)?\s*(\d+(?:[.,]\d+)?))?/i);
    if (grvM) {
      const gw = grvM[1] ? parseFloat(grvM[1].replace(",", ".")) : 3.0;
      features.push({
        id: nextId(),
        kind: "GROOVE_PARTING",
        title: `Канавка / Отрезка (ширина ${gw} мм)`,
        diameter_mm: 45,
        length_or_depth_mm: null,
        width_mm: gw,
        count: 1,
        thread_code: null,
        tolerance: null,
        ra_um: null,
        hole_type: "BLIND",
        notes: "Отрезная/канавочная пластина",
        source: "AUTO",
      });
    }

    // Standard holes & outer diameters from text
    const seenHoles = new Set();
    const outerDiams = [];
    const holeRx = /(?:(\d+)\s*(?:отв\.?|шт\.?|x|х)\s*)?(?:отв\.?\s*)?(?:ø|Ø|ф|Ф)\s*(\d{1,3}(?:[.,]\d+)?)(?:\s*(?:глуб\.?|l=|h=)\s*(\d{1,3}(?:[.,]\d+)?))?/gi;
    while ((m = holeRx.exec(full)) !== null) {
      const cnt = m[1] ? parseInt(m[1], 10) : 1;
      const d = parseFloat(m[2].replace(",", "."));
      const dep = m[3] ? parseFloat(m[3].replace(",", ".")) : null;
      const afterD = full.slice(m.index + m[0].length, m.index + m[0].length + 8).toLowerCase();
      if (/\b(?:H7|H8|H6|IT6|Н7|Н8|Н6)\b/.test(full.slice(m.index + m[0].length, m.index + m[0].length + 8))) continue;
      const ctx = full.slice(Math.max(0, m.index - 20), Math.min(full.length, m.index + m[0].length + 24)).toLowerCase();
      if (/(отв|сверл|глуб|сквоз)/i.test(ctx) || cnt >= 2) {
        if (d >= 1.5 && d <= 55 && !seenHoles.has(d)) {
          seenHoles.add(d);
          features.push({
            id: nextId(),
            kind: "HOLE_DRILL",
            title: `Сверление отверстия Ø${d}${cnt > 1 ? ` (${cnt} отв.)` : ""}`,
            diameter_mm: d,
            length_or_depth_mm: dep || +(d * 3).toFixed(1),
            width_mm: null,
            count: cnt,
            thread_code: null,
            tolerance: null,
            ra_um: null,
            hole_type: ctx.includes("сквоз") ? "THROUGH" : "BLIND",
            notes: "Осевое сверление",
            source: "AUTO",
          });
        }
      } else if (/(внутр|расточ)/i.test(ctx)) {
        features.push({
          id: nextId(),
          kind: "INTERNAL_BORE",
          title: `Внутреннее растачивание Ø${d}`,
          diameter_mm: d,
          length_or_depth_mm: dep || +(d * 1.5).toFixed(1),
          width_mm: null,
          count: 1,
          thread_code: null,
          tolerance: null,
          ra_um: null,
          hole_type: "BLIND",
          notes: "Расточная державка",
          source: "AUTO",
        });
      } else if (d >= 12) {
        outerDiams.push(d);
      }
    }

    // DXF geometry circles
    if (dxfSummary && dxfSummary.circles_by_diameter && dxfSummary.circles_by_diameter.length) {
      const maxC = Math.max(...dxfSummary.circles_by_diameter.map((c) => c.diameter_mm));
      for (const c of dxfSummary.circles_by_diameter) {
        if (c.count === 1 && c.diameter_mm === maxC && c.diameter_mm >= 40) { outerDiams.push(c.diameter_mm); continue; }
        if (c.diameter_mm >= 3 && c.diameter_mm <= 50 && !seenHoles.has(c.diameter_mm)) {
          seenHoles.add(c.diameter_mm);
          features.push({
            id: nextId(),
            kind: "HOLE_DRILL",
            title: `Отверстие из DXF Ø${c.diameter_mm}${c.count > 1 ? ` (${c.count} отв.)` : ""}`,
            diameter_mm: c.diameter_mm,
            length_or_depth_mm: +(c.diameter_mm * 3).toFixed(1),
            width_mm: null,
            count: c.count,
            thread_code: null,
            tolerance: null,
            ra_um: null,
            hole_type: "THROUGH",
            notes: "Распознано по окружностям DXF",
            source: "DXF",
          });
        }
      }
    }

    const envD = outerDiams.length ? Math.max(...outerDiams) : (dxfSummary && dxfSummary.bbox_h_mm ? dxfSummary.bbox_h_mm : null);
    const lenM = low.match(/(?:длина|l\s*=|дл\.?)\s*(\d{2,4})/i);
    const envL = lenM ? parseFloat(lenM[1]) : (dxfSummary && dxfSummary.bbox_w_mm ? dxfSummary.bbox_w_mm : null);

    if (hasTurningKw || (outerDiams.length && !hasMillingKw)) {
      const dT = envD || 60;
      features.unshift({
        id: nextId(),
        kind: "EXTERNAL_ROUGH",
        title: `Наружное точение Ø${dT} (черн./получист.)`,
        diameter_mm: dT,
        length_or_depth_mm: envL || 120,
        width_mm: null,
        count: 1,
        thread_code: null,
        tolerance: null,
        ra_um: null,
        hole_type: "BLIND",
        notes: "Основной съём припуска",
        source: "AUTO",
      });
      if ((hrc == null || hrc < 45) && ((raMin != null && raMin <= 1.6) || low.includes("чистов") || hasShaftPrec)) {
        features.splice(1, 0, {
          id: nextId(),
          kind: "EXTERNAL_FINISH",
          title: `Чистовое точение Ø${dT}${raMin ? ` (Ra ${raMin})` : ""}`,
          diameter_mm: dT,
          length_or_depth_mm: envL || 120,
          width_mm: null,
          count: 1,
          thread_code: null,
          tolerance: null,
          ra_um: raMin || 1.6,
          hole_type: "BLIND",
          notes: "Чистовой проход под шероховатость",
          source: "AUTO",
        });
      }
    }

    if (hasMillingKw) {
      if (/(плоскост|торец|плит|корпус|фланец)/i.test(low)) {
        features.unshift({
          id: nextId(),
          kind: "FACE_MILL",
          title: "Торцевое фрезерование плоскостей",
          diameter_mm: null,
          length_or_depth_mm: envL || 150,
          width_mm: null,
          count: 1,
          thread_code: null,
          tolerance: null,
          ra_um: raMin,
          hole_type: "BLIND",
          notes: "Выравнивание базовых плоскостей",
          source: "AUTO",
        });
      }
      if (/(карман|уступ|паз|контур|лыск|кронштейн|фрезер)/i.test(lowNoTm)) {
        features.push({
          id: nextId(),
          kind: "SHOULDER_POCKET",
          title: "Фрезерование уступов / карманов (90°)",
          diameter_mm: null,
          length_or_depth_mm: envL || 100,
          width_mm: null,
          count: 1,
          thread_code: null,
          tolerance: null,
          ra_um: null,
          hole_type: "BLIND",
          notes: "Контурное и уступное фрезерование",
          source: "AUTO",
        });
      }
      if (/(3d|сфера|радиусн|матриц|штамп)/i.test(low) || grp === "S") {
        features.push({
          id: nextId(),
          kind: "COPY_3D",
          title: "Копировальное 3D-фрезерование",
          diameter_mm: null,
          length_or_depth_mm: null,
          width_mm: null,
          count: 1,
          thread_code: null,
          tolerance: null,
          ra_um: null,
          hole_type: "BLIND",
          notes: "Круглая пластина RDMT",
          source: "AUTO",
        });
      }
    }

    if (!features.length) {
      features.push({
        id: nextId(),
        kind: "EXTERNAL_ROUGH",
        title: "Наружное точение (базовая обработка)",
        diameter_mm: 60,
        length_or_depth_mm: 100,
        width_mm: null,
        count: 1,
        thread_code: null,
        tolerance: null,
        ra_um: null,
        hole_type: "BLIND",
        notes: "Добавьте элементы чертежа вручную или уточните ТТ",
        source: "AUTO",
      });
    }

    const hasTurn = features.some((f) => ["EXTERNAL_ROUGH", "EXTERNAL_FINISH", "INTERNAL_BORE", "GROOVE_PARTING", "THREAD_EXTERNAL"].includes(f.kind));
    const hasMill = features.some((f) => ["FACE_MILL", "SHOULDER_POCKET", "COPY_3D", "HOLE_DRILL", "HOLE_PRECISION", "THREAD_INTERNAL"].includes(f.kind));
    const partType = (hasTurn && hasMill) ? "MILL_TURN" : (hasMill ? "PRISMATIC_MILLED" : "SHAFT_TURNED");

    return {
      part_name: partName || "Деталь по чертежу",
      part_type: partType,
      material_raw: disp,
      material_subgroup: sg,
      iso_group: grp,
      hardness_hrc: hrc,
      envelope_diameter_mm: envD,
      envelope_length_mm: envL,
      ra_min_um: raMin,
      batch_qty: batchQty || 50,
      stability: stability || "STABLE",
      include_holders: includeHolders !== false,
      features,
    };
  }

  function pickBestInsertClient(opts) {
    let pool = FALLBACK_DB.inserts.filter((i) => i.operation_domain === opts.domain);
    if (opts.axialSubtype) {
      const subPool = pool.filter((i) => i.axial_subtype === opts.axialSubtype);
      if (subPool.length) pool = subPool;
    }
    if (!pool.length) pool = FALLBACK_DB.inserts;

    let best = pool[0], bestKey = [-99999, -99999];
    for (const ins of pool) {
      let s = 0;
      const rank = ins.suitability && ins.suitability[opts.isoGroup];
      if (rank === "PRIMARY") s += 100;
      else if (rank === "SECONDARY") s += 55;
      else s -= 40;

      if (opts.preferCodes) {
        for (let idx = 0; idx < opts.preferCodes.length; idx++) {
          if (ins.iso_code.toUpperCase().startsWith(opts.preferCodes[idx].toUpperCase())) {
            s += 45 - idx * 5;
            break;
          }
        }
      }
      if (opts.preferApp && ins.application_class === opts.preferApp) s += 24;
      if (opts.preferHolderCat && (ins.holders || []).some((h) => h.category === opts.preferHolderCat)) s += 35;

      if (opts.targetDiam != null) {
        const h0 = (ins.holders && ins.holders[0]) || {};
        const dc = h0.dc_mm || parseIsoClient(ins.iso_code).ic_mm || opts.targetDiam;
        s += Math.max(-30, Math.round(28 - Math.abs(dc - opts.targetDiam) * 2.5));
      }
      if (opts.targetLd != null && ins.ld_ratio_max) {
        s += ins.ld_ratio_max >= opts.targetLd ? 18 : -15;
      }
      const st = getStockMatchClient(ins.iso_code, ins.grade_code);
      if (st && st.qty > 0) s += 12;

      const negEdgeCost = -(ins.relative_cost / Math.max(ins.cutting_edges_count || 1, 1));
      if (s > bestKey[0] || (s === bestKey[0] && negEdgeCost > bestKey[1])) {
        best = ins;
        bestKey = [s, negEdgeCost];
      }
    }
    return best;
  }

  function calcBatchQtyClient(packQty, edges, batchQty, featCount, domain, isSolid) {
    const totalOps = Math.max(1, (batchQty || 50) * Math.max(1, featCount || 1));
    if (isSolid) return Math.max(1, Math.ceil(totalOps / 180));
    const opsPerEdge = (domain === "TURNING" || domain === "MILLING") ? 25 : 35;
    const neededEdges = Math.ceil(totalOps / opsPerEdge);
    const neededInserts = Math.ceil(neededEdges / Math.max(edges || 1, 1));
    return Math.max(1, Math.ceil(neededInserts / Math.max(packQty || 1, 1))) * packQty;
  }

  function recommendToolingForBlueprintClient(spec) {
    const isoG = spec.iso_group || "P";
    const sgObj = FALLBACK_DB.subgroups.find((s) => s.code === spec.material_subgroup) || FALLBACK_DB.subgroups[0];
    const kitLines = [];
    const warnings = [];
    const threadMap = Object.fromEntries((FALLBACK_DB.threads || []).map((t) => [t.code.toUpperCase(), t]));
    let stepNo = 10;

    for (const feat of (spec.features || [])) {
      let ins, preDrillNote = null, rationale = "";

      if (feat.kind === "EXTERNAL_ROUGH") {
        if (isoG === "H") {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["CNGA"] });
          rationale = `Закалённая сталь (${spec.hardness_hrc || 52} HRC): CBN-пластина для твёрдого точения насухо.`;
        } else if (isoG === "K") {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["SNMG", "WNMG"], preferApp: "ROUGHING" });
          rationale = "Чугун: 8-кромочная SNMG с толстым Al2O3 — минимальная цена кромки.";
        } else if (isoG === "N") {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["CCGT", "DCMT"] });
          rationale = "Алюминий/цветмет: полированная острая кромка без покрытия.";
        } else if (isoG === "M") {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["WNMG 080412", "CNMG 120404"], preferApp: "ROUGHING" });
          rationale = "Нержавейка: вязкий сплав и усиленная кромка против наклёпа.";
        } else if (spec.stability === "INTERRUPTED") {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["WNMG 080412", "CNMG 120408"], preferApp: "ROUGHING" });
          rationale = "Прерывистое/ударное резание: усиленный радиус R1.2 и 6 кромок.";
        } else {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["WNMG 080408", "CNMG 120408"], preferApp: "MEDIUM" });
          rationale = `Оптимальный съём и экономика (6 кр.) для ${spec.material_subgroup}.`;
        }
      } else if (feat.kind === "EXTERNAL_FINISH") {
        if (isoG === "H") {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["CNGA"] });
          rationale = "Финишное твёрдое точение CBN (Ra ≤ 0.8 мкм).";
        } else if (isoG === "N") {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["CCGT", "DCMT"], preferApp: "FINISHING" });
          rationale = "Зеркально полированная пластина RE 0.4 для чистой поверхности.";
        } else if (isoG === "M" || isoG === "S") {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["VNMG", "CNMG 120404"], preferApp: "FINISHING" });
          rationale = "Острый PVD-сплав с RE 0.4 для чистового прохода без наклёпа.";
        } else {
          ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: ["CNMG 120404", "DNMG", "TNMG"], preferApp: "FINISHING" });
          rationale = `Чистовая пластина под Ra ${feat.ra_um || spec.ra_min_um || 1.6} мкм.`;
        }
      } else if (feat.kind === "INTERNAL_BORE") {
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "TURNING", preferCodes: isoG === "N" ? ["CCGT", "DCMT"] : ["CCMT", "DCMT"], preferHolderCat: "BORING_BAR" });
        rationale = `Позитивная 7° пластина для внутреннего растачивания Ø${feat.diameter_mm || 30}.`;
      } else if (feat.kind === "GROOVE_PARTING") {
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "GROOVING_THREADING", preferCodes: ["MGMN"] });
        rationale = `Отрезка и канавки шириной ${feat.width_mm || 3} мм (2 кромки).`;
      } else if (feat.kind === "THREAD_EXTERNAL") {
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "GROOVING_THREADING", preferCodes: ["16ER"] });
        rationale = `Наружная токарная резьба ${feat.thread_code || "60°"} (универсальная AG60, 3 вершины).`;
      } else if (feat.kind === "THREAD_INTERNAL") {
        const tCode = (feat.thread_code || "M12").toUpperCase();
        const method = (isoG === "S" || isoG === "H" || (feat.diameter_mm || 12) >= 16)
          ? "THREAD_MILL"
          : (isoG === "N" && !tCode.includes("NPT") ? "FORM_TAP" : "CUT_TAP");
        const tSpec = threadMap[tCode];
        if (tSpec) {
          const preD = method === "FORM_TAP" ? (tSpec.form_drill_mm || tSpec.cut_drill_mm) : tSpec.cut_drill_mm;
          const minDep = +((feat.length_or_depth_mm || 20) + tSpec.pitch_mm * (feat.hole_type === "BLIND" && method !== "THREAD_MILL" ? 3.5 : 1.5)).toFixed(1);
          preDrillNote = `Предварит. сверло под ${tCode}: Ø${preD.toFixed(2)} мм (глуб. ≥ ${minDep} мм)`;
        }
        const pref = method === "THREAD_MILL" ? ["TM-"] : (method === "FORM_TAP" ? ["FORM-"] : (feat.hole_type === "BLIND" ? ["TAP-M12-BL"] : ["TAP-M10-TH"]));
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "DRILLING", axialSubtype: "TAP_THREAD_MILL", preferCodes: pref, targetDiam: feat.diameter_mm });
        rationale = method === "THREAD_MILL"
          ? `ЦТ резьбофреза для ${tCode} (без риска поломки метчика в ${spec.material_subgroup}).`
          : (method === "FORM_TAP" ? `Бесстружечный раскатник ${tCode} (высокая прочность резьбы).` : `Машинный метчик ${tCode} (${feat.hole_type === "BLIND" ? "глухие" : "сквозные"} отв.).`);
      } else if (feat.kind === "HOLE_PRECISION") {
        const dH = feat.diameter_mm || 20;
        const tol = ["H7", "H8", "IT6"].includes(feat.tolerance) ? feat.tolerance : "H7";
        const useBore = tol === "IT6" || dH >= 24;
        const allowD = useBore ? (dH <= 30 ? 0.40 : 0.60) : (dH <= 6 ? 0.12 : (dH <= 16 ? 0.20 : (dH <= 32 ? 0.25 : 0.35)));
        const preOpt = +(dH - allowD).toFixed(2);
        preDrillNote = `Предварит. отверстие под ${tol}: Ø${preOpt.toFixed(2)} мм (припуск ${(allowD / 2).toFixed(3)} мм/стор.)`;
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "DRILLING", axialSubtype: "REAMER_FINE_BORE", preferCodes: useBore ? ["FBORE"] : ["REAM-H7"], targetDiam: dH });
        rationale = useBore
          ? `Микрометрическая расточка Ø${dH} ${tol} (0.002 мм/дел, цикл G76).`
          : `6-зубая ЦТ развёртка Ø${dH} ${tol} (цикл G85, Ra 0.8 мкм).`;
      } else if (feat.kind === "HOLE_DRILL") {
        const dH = feat.diameter_mm || 12;
        const dep = feat.length_or_depth_mm || +(dH * 3).toFixed(1);
        const ld = +(dep / Math.max(dH, 1)).toFixed(1);
        let sub;
        if (dH <= 13 || isoG === "H") {
          sub = "SOLID_CARBIDE";
          rationale = `Монолит ЦТ с внутр. СОЖ под Ø${dH} (${ld}xD, точность IT8).`;
        } else if (dH <= 20.5) {
          sub = "MODULAR_TIP";
          rationale = `Сменная коронка под Ø${dH} (${ld}xD, быстрая замена, IT9).`;
        } else {
          sub = "INDEXABLE_U_DRILL";
          rationale = `Корпусное U-сверло СМП под Ø${dH} (${ld}xD, выгоднее за отв.).`;
        }
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "DRILLING", axialSubtype: sub, targetDiam: dH, targetLd: ld });
        if (ld > 5) preDrillNote = `Глубокое сверление ${ld}xD: нужен пилот 2xD и СОЖ ≥ 35 бар`;
      } else if (feat.kind === "FACE_MILL") {
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "MILLING", preferCodes: isoG === "N" ? ["APKT 160408-AL"] : ["SEKT"] });
        rationale = isoG === "N" ? "Полированная фрезерная пластина для плоскостей по цветмету." : "Торцевая фреза 45° SEKT (4 кр.) — мягкий вход и высокая подача.";
      } else if (feat.kind === "COPY_3D") {
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "MILLING", preferCodes: ["RDMT", "APKT"] });
        rationale = "Круглая пластина RDMT (6 кр.) для 3D-поверхностей и сложных сплавов.";
      } else {
        ins = pickBestInsertClient({ isoGroup: isoG, domain: "MILLING", preferCodes: isoG === "N" ? ["APKT 160408-AL"] : ["APKT 160408"] });
        rationale = "Уступное и контурное фрезерование 90° (APKT с зачистной фаской Wiper).";
      }

      const st = getStockMatchClient(ins.iso_code, ins.grade_code);
      const stockQty = st ? st.qty : 0;
      const unitPrice = st ? st.unit_price_rub : Math.round((ins.relative_cost || 1) * 650);
      const packQty = getPackQty(ins);
      const isSolid = ["SOLID_CARBIDE", "TAP_THREAD_MILL", "REAMER_FINE_BORE"].includes(ins.axial_subtype);
      const recQty = calcBatchQtyClient(packQty, ins.cutting_edges_count, spec.batch_qty, feat.count, ins.operation_domain, isSolid);
      const h0 = (ins.holders && ins.holders[0]) || null;
      const hPrice = h0 ? (HOLDER_UPSELL_PRICES[h0.category] || 5500) : null;

      const dims = [];
      if (feat.diameter_mm) dims.push(`Ø${feat.diameter_mm} мм`);
      if (feat.length_or_depth_mm) dims.push(`L=${feat.length_or_depth_mm} мм`);
      if (feat.width_mm) dims.push(`W=${feat.width_mm} мм`);
      if (feat.count > 1) dims.push(`${feat.count} шт/дет`);
      if (feat.tolerance) dims.push(feat.tolerance);
      if (feat.ra_um) dims.push(`Ra ${feat.ra_um}`);

      kitLines.push({
        step_no: stepNo,
        feature_id: feat.id,
        operation_title: feat.title,
        feature_summary: dims.join(" · ") || feat.notes || feat.title,
        insert_id: ins.insert_id,
        iso_code: ins.iso_code,
        shape_code: parseIsoClient(ins.iso_code).shape_code || "C",
        operation_domain: ins.operation_domain,
        grade_code: ins.grade_code,
        coating_method: ins.coating_method,
        cutting_edges_count: ins.cutting_edges_count,
        unit_price_rub: unitPrice,
        pack_qty: packQty,
        recommended_qty: recQty,
        line_total_rub: Math.round(unitPrice * recQty),
        stock_qty: stockQty,
        in_stock: stockQty >= recQty,
        bin_location: st ? (st.bin_location || "") : "",
        holder_code: h0 ? h0.code : null,
        holder_category: h0 ? h0.category : null,
        holder_price_rub: hPrice,
        pre_drill_note: preDrillNote,
        shared_with_step: null,
        rationale,
      });
      stepNo += 10;
    }

    // Deduplicate shared inserts
    const seenIns = {};
    for (const ln of kitLines) {
      if (seenIns[ln.insert_id]) {
        ln.shared_with_step = seenIns[ln.insert_id];
        ln.recommended_qty = 0;
        ln.line_total_rub = 0;
        ln.rationale += ` (Тот же инструмент, что на Оп. ${ln.shared_with_step} — без доплаты.)`;
      } else {
        seenIns[ln.insert_id] = ln.step_no;
      }
    }

    const totalInserts = Math.round(kitLines.reduce((a, l) => a + l.line_total_rub, 0));
    const uniqueHolders = {};
    for (const ln of kitLines) {
      if (ln.holder_code && ln.holder_price_rub) uniqueHolders[ln.holder_code] = ln.holder_price_rub;
    }
    const totalHolders = spec.include_holders ? Math.round(Object.values(uniqueHolders).reduce((a, v) => a + v, 0)) : 0;
    const inStockCnt = kitLines.filter((l) => l.stock_qty > 0).length;

    return {
      spec,
      kit_lines: kitLines,
      total_operations: kitLines.length,
      total_inserts_rub: totalInserts,
      total_holders_rub: totalHolders,
      grand_total_rub: totalInserts + totalHolders,
      in_stock_count: inStockCnt,
      backorder_count: kitLines.length - inStockCnt,
      warnings,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Optional Direct Browser Gemini Vision AI Call (works on GitHub Pages too!)
  // ---------------------------------------------------------------------------
  async function analyzeImageWithGeminiClient(b64Data, mimeType, apiKey, filename, batchQty, stability, includeHolders) {
    if (!apiKey) return null;
    const prompt =
      "You are a CNC manufacturing & ESKD blueprint engineer. Analyze this engineering drawing and return ONLY valid JSON:\n" +
      '{"part_name":"short Russian name","material_text":"e.g. Сталь 40Х HRC 52 or 12Х18Н10Т","envelope_diameter_mm":null,"envelope_length_mm":null,"ra_min_um":null,' +
      '"features":[{"kind":"EXTERNAL_ROUGH|EXTERNAL_FINISH|INTERNAL_BORE|GROOVE_PARTING|THREAD_EXTERNAL|THREAD_INTERNAL|HOLE_DRILL|HOLE_PRECISION|FACE_MILL|SHOULDER_POCKET|COPY_3D",' +
      '"title":"Russian title","diameter_mm":null,"length_or_depth_mm":null,"width_mm":null,"count":1,"thread_code":null,"tolerance":null,"ra_um":null,"hole_type":"BLIND"}]}';
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: b64Data } }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
          }),
        }
      );
      if (!resp.ok) return null;
      const body = await resp.json();
      let txt = body?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      txt = txt.replace(/^```json\s*|\s*```$/g, "").trim();
      const data = JSON.parse(txt);
      const { sg, grp, disp, hrc } = detectMaterialClient(data.material_text || "");
      const feats = (data.features || []).map((f, i) => ({
        id: `vis-${i + 1}`,
        kind: FEATURE_KIND_LABELS[f.kind] ? f.kind : "EXTERNAL_ROUGH",
        title: f.title || FEATURE_KIND_LABELS[f.kind] || "Операция",
        diameter_mm: f.diameter_mm != null ? Number(f.diameter_mm) : null,
        length_or_depth_mm: f.length_or_depth_mm != null ? Number(f.length_or_depth_mm) : null,
        width_mm: f.width_mm != null ? Number(f.width_mm) : null,
        count: Math.max(1, parseInt(f.count, 10) || 1),
        thread_code: f.thread_code ? String(f.thread_code).toUpperCase() : null,
        tolerance: f.tolerance ? String(f.tolerance).toUpperCase() : null,
        ra_um: f.ra_um != null ? Number(f.ra_um) : null,
        hole_type: f.hole_type === "THROUGH" ? "THROUGH" : "BLIND",
        notes: "Распознано Gemini Vision с чертежа",
        source: "VISION_AI",
      }));
      if (!feats.length) return null;
      return {
        part_name: data.part_name || filename,
        part_type: "MILL_TURN",
        material_raw: data.material_text || disp,
        material_subgroup: sg,
        iso_group: grp,
        hardness_hrc: hrc,
        envelope_diameter_mm: data.envelope_diameter_mm || null,
        envelope_length_mm: data.envelope_length_mm || null,
        ra_min_um: data.ra_min_um || null,
        batch_qty: batchQty,
        stability,
        include_holders: includeHolders,
        features: feats,
      };
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. File Upload, Demo Loading & Recalculation Orchestration
  // ---------------------------------------------------------------------------
  function buildSpecFromCad3dClient(cad3d, notesText, batchQty, stability, includeHolders) {
    const combinedMeta = `${cad3d.part_name || ""}\n${notesText || ""}`.trim();
    const { sg, grp, disp, hrc } = detectMaterialClient(combinedMeta);

    const features = (cad3d.features || []).map((f) => ({ ...f }));
    let raMin = null;

    if (notesText && notesText.trim()) {
      const nSpec = parseDrawingAnnotationsClient(notesText, cad3d.part_name, null, batchQty, stability, includeHolders);
      raMin = nSpec.ra_min_um;
      for (const nf of nSpec.features) {
        if (["THREAD_INTERNAL", "THREAD_EXTERNAL", "HOLE_PRECISION", "GROOVE_PARTING"].includes(nf.kind)) {
          if (nf.kind === "GROOVE_PARTING" && features.some((f) => f.kind === "GROOVE_PARTING")) continue;
          if (nf.kind === "HOLE_PRECISION" && nf.diameter_mm != null) {
            const idx = features.findIndex((cf) => ["HOLE_DRILL", "INTERNAL_BORE"].includes(cf.kind) && cf.diameter_mm != null && Math.abs(cf.diameter_mm - nf.diameter_mm) <= 0.6);
            if (idx >= 0) {
              const cf = features[idx];
              features[idx] = {
                ...cf,
                kind: "HOLE_PRECISION",
                title: nf.title,
                diameter_mm: nf.diameter_mm,
                count: Math.max(cf.count || 1, nf.count || 1),
                tolerance: nf.tolerance,
                ra_um: nf.ra_um,
                notes: `${nf.notes} (уточнено по ТТ для 3D-отверстия)`,
              };
              continue;
            }
          }
          features.push(nf);
        }
      }
    }

    if (!features.length) {
      features.push({
        id: "cad-fallback-1", kind: "FACE_MILL", title: "Базовая фрезерная обработка 3D-заготовки",
        diameter_mm: null, length_or_depth_mm: Math.max(cad3d.bbox_x_mm || 100, cad3d.bbox_y_mm || 100),
        width_mm: null, count: 1, thread_code: null, tolerance: null, ra_um: null, hole_type: "BLIND",
        notes: "Распознано по 3D-модели", source: "STEP_3D",
      });
    }

    const dims = [cad3d.bbox_x_mm || 0, cad3d.bbox_y_mm || 0, cad3d.bbox_z_mm || 0];
    return {
      part_name: cad3d.part_name || "3D-модель заготовки",
      part_type: cad3d.part_type || "MILL_TURN",
      material_raw: disp,
      material_subgroup: sg,
      iso_group: grp,
      hardness_hrc: hrc,
      envelope_diameter_mm: cad3d.max_outer_diameter_mm || null,
      envelope_length_mm: Math.max(...dims) || null,
      ra_min_um: raMin,
      batch_qty: batchQty || 50,
      stability: stability || "STABLE",
      include_holders: includeHolders !== false,
      features,
    };
  }

  async function ensureDrwViewer3D() {
    if (drawingState.drwViewer3d) return drawingState.drwViewer3d;
    if (typeof SKMViewer3D !== "function") return null;
    const v = new SKMViewer3D({ mountId: "drw3dMount", infoId: "drw3dInfo", statusId: "drw3dStatus" });
    await v.init();
    drawingState.drwViewer3d = v;
    return v;
  }

  async function renderDrw3DModel() {
    const v = await ensureDrwViewer3D();
    if (!v) return;
    if (drawingState.cad3dFileObj) {
      try {
        await v.loadCadFile(drawingState.cad3dFileObj);
        return;
      } catch (err) {
        // Offline or lightweight STEP fallback: render procedural 3D solid from parsed B-Rep!
        if (typeof buildProceduralWorkpieceParts === "function" && drawingState.cad3dSummary) {
          const parts = buildProceduralWorkpieceParts(drawingState.cad3dDemoKind, drawingState.cad3dSummary);
          v.setParts(parts, `${drawingState.filename} (B-Rep 3D предпросмотр)`, "UNCOATED", "", true);
        }
        return;
      }
    }
    if (typeof buildProceduralWorkpieceParts === "function") {
      const parts = buildProceduralWorkpieceParts(drawingState.cad3dDemoKind, drawingState.cad3dSummary);
      v.setParts(parts, `${drawingState.filename} (3D STEP)`, "UNCOATED", "", true);
    }
  }

  function loadDemo3DWorkpiece(demoId) {
    if (typeof generateDemoStepClient !== "function" || typeof parseStepWorkpieceClient !== "function") return;
    const demo = generateDemoStepClient(demoId);
    drawingState.activeDemoId = demoId;
    drawingState.filename = demo.filename;
    drawingState.format = "STEP";
    drawingState.analysisMethod = "STEP_3D_CAD_AFR";
    drawingState.previewType = "cad3d";
    drawingState.cad3dDemoKind = demoId;
    drawingState.cad3dFileObj = null;
    drawingState.dxfSummary = null;
    drawingState.cad3dSummary = null;
    drawingState.lastFileBytesB64 = null;

    const notesEl = document.getElementById("drwNotesInput");
    if (notesEl) notesEl.value = demo.notes;

    const ctrl = getDrawingControls();
    const cad3d = parseStepWorkpieceClient(demo.content, demo.filename);
    drawingState.cad3dSummary = cad3d;
    drawingState.spec = buildSpecFromCad3dClient(cad3d, demo.notes, ctrl.batchQty, ctrl.stability, ctrl.includeHolders);
    drawingState.plan = recommendToolingForBlueprintClient(drawingState.spec);

    syncSpecControlsFromState();
    renderDrawingWorkspace();
    renderDrw3DModel();
  }

  function downloadCurrentDemoStep() {
    if (typeof generateDemoStepClient !== "function") return;
    const id = drawingState.cad3dDemoKind || "step-shaft-p1";
    const demo = generateDemoStepClient(id);
    if (typeof downloadFile === "function") {
      downloadFile(demo.filename, demo.content, "application/step");
      showToast(`Скачан 3D CAD файл ${demo.filename} — можно открыть в CAD или загрузить сюда!`);
    }
  }

  function setDrw3dView(preset) { if (drawingState.drwViewer3d) drawingState.drwViewer3d.setView(preset); }
  function toggleDrw3dWire() {
    if (!drawingState.drwViewer3d) return;
    const on = drawingState.drwViewer3d.toggleWireframe();
    document.getElementById("btnDrw3dWire")?.classList.toggle("active", on);
  }
  function toggleDrw3dAxes() {
    if (!drawingState.drwViewer3d) return;
    const on = drawingState.drwViewer3d.toggleAxes();
    document.getElementById("btnDrw3dAxes")?.classList.toggle("active", on);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || "");
        const idx = res.indexOf(",");
        resolve(idx >= 0 ? res.slice(idx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function getDrawingControls() {
    return {
      batchQty: Math.max(1, parseInt(document.getElementById("drwBatchQty")?.value, 10) || 50),
      stability: document.getElementById("drwStabilitySel")?.value || "STABLE",
      includeHolders: document.getElementById("drwIncludeHoldersChk")?.checked !== false,
      notesText: document.getElementById("drwNotesInput")?.value || "",
      geminiKey: (document.getElementById("drwGeminiKeyInput")?.value || localStorage.getItem(GEMINI_KEY_STORAGE) || "").trim(),
    };
  }

  async function handleDrawingFile(file) {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const wasDemo = !!drawingState.activeDemoId;
    if (wasDemo) {
      const notesEl = document.getElementById("drwNotesInput");
      if (notesEl) notesEl.value = "";
    }
    const ctrl = getDrawingControls();
    drawingState.filename = file.name;
    drawingState.format = ext.toUpperCase();
    drawingState.activeDemoId = null;
    drawingState.zoomPct = 100;

    if (drawingState.previewUrl) {
      try { URL.revokeObjectURL(drawingState.previewUrl); } catch {}
      drawingState.previewUrl = null;
    }

    const statusBadge = document.getElementById("drwMethodBadge");
    if (statusBadge) statusBadge.textContent = `Анализ ${file.name}...`;

    const b64 = await fileToBase64(file);
    drawingState.lastFileBytesB64 = b64;
    drawingState.lastFileMime = file.type || (ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`);

    drawingState.cad3dSummary = null;
    drawingState.cad3dDemoKind = null;
    drawingState.cad3dFileObj = null;

    if (["step", "stp", "stl", "iges", "igs"].includes(ext)) {
      drawingState.previewType = "cad3d";
      drawingState.cad3dFileObj = file;
      drawingState.dxfSummary = null;
      if (ext === "step" || ext === "stp") {
        const txt = await file.text();
        drawingState.cad3dSummary = parseStepWorkpieceClient(txt, file.name);
      } else if (ext === "stl") {
        const buf = await file.arrayBuffer();
        drawingState.cad3dSummary = parseStlWorkpieceClient(buf, file.name);
      } else {
        drawingState.cad3dSummary = {
          format: "IGES", part_name: file.name.replace(/\.[^.]+$/, ""), part_type: "MILL_TURN",
          bbox_x_mm: 100, bbox_y_mm: 100, bbox_z_mm: 50, internal_holes_count: 0,
          stock_volume_cm3: 500, part_volume_cm3: 320, removal_volume_cm3: 180, features: [],
        };
      }
    } else if (ext === "dxf") {
      const txt = await file.text();
      drawingState.previewType = "dxf";
      drawingState.dxfSummary = parseDxfClient(txt);
    } else if (ext === "pdf") {
      drawingState.previewType = "pdf";
      drawingState.previewUrl = URL.createObjectURL(file);
      drawingState.dxfSummary = null;
    } else if (["png", "jpg", "jpeg", "webp", "bmp"].includes(ext)) {
      drawingState.previewType = "image";
      drawingState.previewUrl = URL.createObjectURL(file);
      drawingState.dxfSummary = null;
    } else {
      const txt = await file.text();
      drawingState.previewType = "svg";
      drawingState.previewSvgKind = "shaft";
      drawingState.dxfSummary = null;
      const notesEl = document.getElementById("drwNotesInput");
      if (notesEl) notesEl.value = txt;
      ctrl.notesText = txt;
    }

    // Try Live FastAPI /api/drawing/analyze first (handles PDF zlib extraction + DXF + Vision AI)
    let handledByApi = false;
    if (global.state && global.state.apiLive) {
      try {
        const resp = await fetch(`${global.state.apiBase}/api/drawing/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            content_base64: b64,
            notes_text: ctrl.notesText,
            batch_qty: ctrl.batchQty,
            stability: ctrl.stability,
            include_holders: ctrl.includeHolders,
            gemini_api_key: ctrl.geminiKey || null,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          drawingState.analysisMethod = data.analysis_method;
          if (data.dxf_summary) drawingState.dxfSummary = data.dxf_summary;
          if (data.cad3d_summary) drawingState.cad3dSummary = data.cad3d_summary;
          if (data.extracted_text) {
            const notesEl = document.getElementById("drwNotesInput");
            if (notesEl) notesEl.value = data.extracted_text;
          }
          drawingState.spec = data.plan.spec;
          drawingState.plan = data.plan;
          handledByApi = true;
        }
      } catch {}
    }

    if (!handledByApi) {
      let spec = null;
      if (["png", "jpg", "jpeg", "webp", "pdf"].includes(ext) && ctrl.geminiKey) {
        spec = await analyzeImageWithGeminiClient(b64, drawingState.lastFileMime, ctrl.geminiKey, file.name, ctrl.batchQty, ctrl.stability, ctrl.includeHolders);
        if (spec) drawingState.analysisMethod = "GEMINI_VISION_AI";
      }
      if (!spec) {
        if (["step", "stp", "stl", "iges", "igs"].includes(ext) && drawingState.cad3dSummary) {
          drawingState.analysisMethod = ext === "stl" ? "STL_3D_MESH_AFR" : (ext.startsWith("ig") ? "IGES_3D_CAD_PREVIEW" : "STEP_3D_CAD_AFR");
          spec = buildSpecFromCad3dClient(
            drawingState.cad3dSummary,
            document.getElementById("drwNotesInput")?.value || "",
            ctrl.batchQty,
            ctrl.stability,
            ctrl.includeHolders
          );
        } else {
          if (ext === "dxf") {
            const dxfTxt = (drawingState.dxfSummary?.texts || []).join("\n");
            const notesEl = document.getElementById("drwNotesInput");
            if (notesEl && dxfTxt && !notesEl.value.trim()) notesEl.value = dxfTxt;
            drawingState.analysisMethod = "DXF_CAD_GEOMETRY_PARSER";
          } else {
            drawingState.analysisMethod = ["png", "jpg", "jpeg", "webp"].includes(ext) ? "IMAGE_PREVIEW_AND_TT" : "ESKD_TEXT_PARSER";
          }
          spec = parseDrawingAnnotationsClient(
            document.getElementById("drwNotesInput")?.value || "",
            file.name.replace(/\.[^.]+$/, ""),
            drawingState.dxfSummary,
            ctrl.batchQty,
            ctrl.stability,
            ctrl.includeHolders
          );
        }
      }
      drawingState.spec = spec;
      drawingState.plan = recommendToolingForBlueprintClient(spec);
    }

    if (drawingState.analysisMethod === "IMAGE_PREVIEW_AND_TT" && !(document.getElementById("drwNotesInput")?.value || "").trim()) {
      drawingState.plan.warnings = drawingState.plan.warnings || [];
      if (!drawingState.plan.warnings.some((w) => w.includes("GEMINI_API_KEY"))) {
        drawingState.plan.warnings.unshift(
          "Для автоматического чтения фото/скана (JPG/PNG) добавьте GEMINI_API_KEY в Render или через кнопку «🤖 ИИ-зрение для сканов», либо впишите основные размеры в поле ТТ ниже."
        );
      }
      if (!drawingState.visionPanelOpen) toggleVisionKeyPanel();
    }
    syncSpecControlsFromState();
    renderDrawingWorkspace();
    if (drawingState.previewType === "cad3d") renderDrw3DModel();
    showToast(
      drawingState.analysisMethod === "IMAGE_PREVIEW_AND_TT" && !(document.getElementById("drwNotesInput")?.value || "").trim()
        ? `Скан «${file.name}» открыт — введите Gemini API Key или размеры в поле ТТ!`
        : `${drawingState.previewType === "cad3d" ? "3D-модель" : "Чертёж"} «${file.name}» обработан(а) · подобрано ${drawingState.plan.total_operations} оп.`
    );
  }

  function loadDemoBlueprint(demoId) {
    const demo = DRAWING_DEMOS.find((d) => d.id === demoId) || DRAWING_DEMOS[0];
    drawingState.activeDemoId = demo.id;
    drawingState.filename = demo.filename;
    drawingState.format = demo.filename.split(".").pop().toUpperCase();
    drawingState.analysisMethod = "DEMO_ESKD_PARSER";
    drawingState.previewType = "svg";
    drawingState.previewSvgKind = demo.svgKind;
    drawingState.dxfSummary = null;
    drawingState.cad3dSummary = null;
    drawingState.cad3dDemoKind = null;
    drawingState.cad3dFileObj = null;
    drawingState.lastFileBytesB64 = null;

    const notesEl = document.getElementById("drwNotesInput");
    if (notesEl) notesEl.value = demo.notes_text;

    const ctrl = getDrawingControls();
    drawingState.spec = parseDrawingAnnotationsClient(
      demo.notes_text, demo.title, null, ctrl.batchQty, ctrl.stability, ctrl.includeHolders
    );
    drawingState.plan = recommendToolingForBlueprintClient(drawingState.spec);
    syncSpecControlsFromState();
    renderDrawingWorkspace();
  }

  function parseNotesFromTextarea() {
    const ctrl = getDrawingControls();
    if (drawingState.previewType === "cad3d" && drawingState.cad3dSummary) {
      drawingState.spec = buildSpecFromCad3dClient(
        drawingState.cad3dSummary, ctrl.notesText, ctrl.batchQty, ctrl.stability, ctrl.includeHolders
      );
      drawingState.analysisMethod = drawingState.cad3dSummary.format === "STL" ? "STL_3D_AND_TT" : "STEP_3D_AND_TT";
    } else {
      const partName = drawingState.filename ? drawingState.filename.replace(/\.[^.]+$/, "") : "Деталь по ТТ чертежа";
      drawingState.spec = parseDrawingAnnotationsClient(
        ctrl.notesText, partName, drawingState.dxfSummary, ctrl.batchQty, ctrl.stability, ctrl.includeHolders
      );
      drawingState.analysisMethod = drawingState.dxfSummary ? "DXF_AND_TT_PARSER" : "ESKD_TEXT_PARSER";
    }
    syncSpecControlsFromState();
    recomputeDrawingPlan();
    showToast(`Распознано конструктивных элементов: ${drawingState.spec.features.length}`);
  }

  async function runVisionOnCurrentImage() {
    const ctrl = getDrawingControls();
    if (!ctrl.geminiKey) {
      showToast("Вставьте Gemini API ключ в поле «ИИ-распознавание сканов».");
      return;
    }
    localStorage.setItem(GEMINI_KEY_STORAGE, ctrl.geminiKey);
    if (!drawingState.lastFileBytesB64) {
      showToast("Сначала загрузите скан/фото чертежа (PNG, JPG или PDF).");
      return;
    }
    const badge = document.getElementById("drwMethodBadge");
    if (badge) badge.textContent = "🤖 Gemini Vision читает чертёж...";
    const spec = await analyzeImageWithGeminiClient(
      drawingState.lastFileBytesB64, drawingState.lastFileMime, ctrl.geminiKey,
      drawingState.filename, ctrl.batchQty, ctrl.stability, ctrl.includeHolders
    );
    if (!spec) {
      showToast("Не удалось распознать через Gemini Vision — проверьте ключ API или введите ТТ вручную.");
      renderDrawingWorkspace();
      return;
    }
    drawingState.spec = spec;
    drawingState.analysisMethod = "GEMINI_VISION_AI";
    drawingState.plan = recommendToolingForBlueprintClient(spec);
    syncSpecControlsFromState();
    renderDrawingWorkspace();
    showToast(`🤖 Gemini Vision распознал ${spec.features.length} элементов на чертеже!`);
  }

  async function recomputeDrawingPlan() {
    if (!drawingState.spec) return;
    const matSel = document.getElementById("drwMaterialSel");
    if (matSel) {
      const sg = FALLBACK_DB.subgroups.find((s) => s.code === matSel.value);
      if (sg) {
        drawingState.spec.material_subgroup = sg.code;
        drawingState.spec.iso_group = sg.iso_group;
        drawingState.spec.material_raw = sg.name_ru;
      }
    }
    drawingState.spec.batch_qty = Math.max(1, parseInt(document.getElementById("drwBatchQty")?.value, 10) || 50);
    drawingState.spec.stability = document.getElementById("drwStabilitySel")?.value || "STABLE";
    drawingState.spec.include_holders = document.getElementById("drwIncludeHoldersChk")?.checked !== false;

    let apiOk = false;
    if (global.state && global.state.apiLive) {
      try {
        const r = await fetch(`${global.state.apiBase}/api/drawing/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(drawingState.spec),
        });
        if (r.ok) {
          drawingState.plan = await r.json();
          apiOk = true;
        }
      } catch {}
    }
    if (!apiOk) {
      drawingState.plan = recommendToolingForBlueprintClient(drawingState.spec);
    }
    renderDrawingWorkspace();
  }

  function syncSpecControlsFromState() {
    const spec = drawingState.spec;
    if (!spec) return;
    const matSel = document.getElementById("drwMaterialSel");
    if (matSel) matSel.value = spec.material_subgroup;
    const bInp = document.getElementById("drwBatchQty");
    if (bInp) bInp.value = spec.batch_qty;
    const stSel = document.getElementById("drwStabilitySel");
    if (stSel) stSel.value = spec.stability;
    const hChk = document.getElementById("drwIncludeHoldersChk");
    if (hChk) hChk.checked = spec.include_holders !== false;
  }

  // ---------------------------------------------------------------------------
  // 6. Interactive Feature Editing (Add / Edit / Delete Features)
  // ---------------------------------------------------------------------------
  function updateDrawingFeature(featId, field, rawVal) {
    if (!drawingState.spec) return;
    const f = drawingState.spec.features.find((x) => x.id === featId);
    if (!f) return;
    if (field === "count") f.count = Math.max(1, parseInt(rawVal, 10) || 1);
    else if (field === "diameter_mm") f.diameter_mm = rawVal === "" ? null : parseFloat(rawVal);
    else if (field === "length_or_depth_mm") f.length_or_depth_mm = rawVal === "" ? null : parseFloat(rawVal);
    recomputeDrawingPlan();
  }

  function removeDrawingFeature(featId) {
    if (!drawingState.spec) return;
    drawingState.spec.features = drawingState.spec.features.filter((x) => x.id !== featId);
    recomputeDrawingPlan();
  }

  function toggleAddFeatureForm() {
    drawingState.addFormOpen = !drawingState.addFormOpen;
    const box = document.getElementById("drwAddFeatureBox");
    if (box) box.style.display = drawingState.addFormOpen ? "block" : "none";
  }

  function submitAddDrawingFeature(e) {
    if (e) e.preventDefault();
    if (!drawingState.spec) return;
    const kind = document.getElementById("drwNewKind").value;
    const dVal = parseFloat(document.getElementById("drwNewDiam").value);
    const lVal = parseFloat(document.getElementById("drwNewDepth").value);
    const cnt = Math.max(1, parseInt(document.getElementById("drwNewCount").value, 10) || 1);
    const extra = (document.getElementById("drwNewExtra").value || "").trim().toUpperCase();

    const baseLbl = FEATURE_KIND_LABELS[kind] || kind;
    let title = baseLbl;
    if (kind === "THREAD_INTERNAL" || kind === "THREAD_EXTERNAL") title = `${kind === "THREAD_EXTERNAL" ? "Наружная резьба" : "Резьба отв."} ${extra || "M12"}${cnt > 1 ? ` (${cnt} отв.)` : ""}`;
    else if (kind === "HOLE_PRECISION") title = `Точное отв. Ø${dVal || 20} ${extra || "H7"}${cnt > 1 ? ` (${cnt} отв.)` : ""}`;
    else if (dVal) title = `${baseLbl.split(" (")[0]} Ø${dVal}${cnt > 1 ? ` (${cnt} шт)` : ""}`;

    drawingState.spec.features.push({
      id: `user-${Date.now()}`,
      kind,
      title,
      diameter_mm: isNaN(dVal) ? null : dVal,
      length_or_depth_mm: isNaN(lVal) ? null : lVal,
      width_mm: kind === "GROOVE_PARTING" ? (isNaN(dVal) ? 3.0 : dVal) : null,
      count: cnt,
      thread_code: (kind === "THREAD_INTERNAL" || kind === "THREAD_EXTERNAL") ? (extra || "M12") : null,
      tolerance: kind === "HOLE_PRECISION" ? (["H7", "H8", "IT6"].includes(extra) ? extra : "H7") : null,
      ra_um: kind === "EXTERNAL_FINISH" ? 1.6 : null,
      hole_type: "BLIND",
      notes: "Добавлено вручную по чертежу",
      source: "USER",
    });
    drawingState.addFormOpen = false;
    const box = document.getElementById("drwAddFeatureBox");
    if (box) box.style.display = "none";
    recomputeDrawingPlan();
    showToast(`Добавлен элемент: ${title}`);
  }

  function setDrawingBatchPreset(qty) {
    const inp = document.getElementById("drwBatchQty");
    if (inp) inp.value = qty;
    recomputeDrawingPlan();
  }

  function setDrawingZoom(pct) {
    drawingState.zoomPct = pct;
    const img = document.getElementById("drwPreviewImg");
    if (img) {
      if (pct === 0) { img.style.width = "100%"; img.style.maxWidth = "100%"; }
      else { img.style.width = `${pct}%`; img.style.maxWidth = "none"; }
    }
  }

  function toggleVisionKeyPanel() {
    drawingState.visionPanelOpen = !drawingState.visionPanelOpen;
    const el = document.getElementById("drwVisionKeyPanel");
    if (el) el.style.display = drawingState.visionPanelOpen ? "flex" : "none";
  }

  function saveGeminiVisionKey() {
    const val = (document.getElementById("drwGeminiKeyInput")?.value || "").trim();
    localStorage.setItem(GEMINI_KEY_STORAGE, val);
    showToast(val ? "Gemini Vision API ключ сохранён локально в браузере." : "Ключ удалён.");
  }

  // ---------------------------------------------------------------------------
  // 7. 1-Click Sales Integration: Push Entire Blueprint Tooling Kit -> Order Cart / KP
  // ---------------------------------------------------------------------------
  function addBlueprintKitToCart(openQuoteImmediately = false) {
    const plan = drawingState.plan;
    if (!plan || !plan.kit_lines || !plan.kit_lines.length) {
      showToast("Нет подобранных позиций для добавления в заказ.");
      return;
    }

    const addedHolders = new Set();
    let linesAdded = 0;

    for (const ln of plan.kit_lines) {
      if (!ln.shared_with_step && ln.recommended_qty > 0) {
        const existing = global.state.orderCart.find((c) => c.item_type === "INSERT" && c.insert_id === ln.insert_id);
        if (existing) {
          existing.qty += ln.recommended_qty;
        } else {
          global.state.orderCart.push({
            line_id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            item_type: "INSERT",
            insert_id: ln.insert_id,
            code: ln.iso_code,
            description: `${ln.grade_code} · Оп.${ln.step_no} ${ln.operation_title}`,
            qty: ln.recommended_qty,
            pack_qty: ln.pack_qty,
            unit_price_rub: ln.unit_price_rub,
            stock_qty: ln.stock_qty,
          });
        }
        linesAdded++;
      }

      if (plan.spec.include_holders && ln.holder_code && !addedHolders.has(ln.holder_code)) {
        addedHolders.add(ln.holder_code);
        const existingH = global.state.orderCart.find((c) => c.item_type === "HOLDER" && c.code === ln.holder_code);
        if (!existingH) {
          global.state.orderCart.push({
            line_id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            item_type: "HOLDER",
            insert_id: null,
            code: ln.holder_code,
            description: `Корпус/державка под ${ln.iso_code} (${plan.spec.part_name})`,
            qty: 1,
            pack_qty: 1,
            unit_price_rub: ln.holder_price_rub || 5500,
            stock_qty: 5,
          });
        }
      }
    }

    const commInp = document.getElementById("ordComment");
    if (commInp && !commInp.value.trim()) {
      commInp.value = `Комплект по чертежу «${plan.spec.part_name}» (${plan.spec.material_subgroup}, партия ${plan.spec.batch_qty} шт)`;
    }

    persistOrderCart();
    renderOrderCart();
    renderSalesCatalog();

    if (openQuoteImmediately) {
      openQuoteModal();
    } else {
      showToast(`Весь комплект по чертежу (${linesAdded} поз. + ${addedHolders.size} корп.) добавлен в корзину!`);
    }
  }

  function addSingleKitLineToCart(stepNo) {
    const ln = drawingState.plan && drawingState.plan.kit_lines.find((x) => x.step_no === stepNo);
    if (!ln) return;
    const qty = ln.recommended_qty > 0 ? ln.recommended_qty : ln.pack_qty;
    const existing = global.state.orderCart.find((c) => c.item_type === "INSERT" && c.insert_id === ln.insert_id);
    if (existing) existing.qty += qty;
    else {
      global.state.orderCart.push({
        line_id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item_type: "INSERT",
        insert_id: ln.insert_id,
        code: ln.iso_code,
        description: `${ln.grade_code} · Оп.${ln.step_no} ${ln.operation_title}`,
        qty,
        pack_qty: ln.pack_qty,
        unit_price_rub: ln.unit_price_rub,
        stock_qty: ln.stock_qty,
      });
    }
    persistOrderCart();
    renderOrderCart();
    renderSalesCatalog();
    showToast(`Добавлено: ${ln.iso_code} (${qty} шт)`);
  }

  // ---------------------------------------------------------------------------
  // 8. Render Complete Drawing-to-Tooling Workspace
  // ---------------------------------------------------------------------------
  function renderDrawingWorkspace() {
    const plan = drawingState.plan;
    const spec = drawingState.spec;
    if (!plan || !spec) return;

    // Highlight active demo button
    document.querySelectorAll("[data-demo-bp]").forEach((b) =>
      b.classList.toggle("active", b.dataset.demoBp === drawingState.activeDemoId)
    );

    const methodLabels = {
      DXF_CAD_GEOMETRY_PARSER: "DXF CAD-парсер (геометрия + текст)",
      PDF_TEXT_ESKD_PARSER: "PDF ЕСКД-парсер текста",
      GEMINI_VISION_AI: "🤖 Gemini Vision AI",
      IMAGE_PREVIEW_AND_TT: "Изображение + ТТ чертежа",
      DEMO_ESKD_PARSER: "Демо-чертёж ЕСКД",
      ESKD_TEXT_PARSER: "ЕСКД-анализатор текста",
      DXF_AND_TT_PARSER: "DXF + ТТ чертежа",
      STEP_3D_CAD_AFR: "🧊 3D STEP B-Rep AFR (авто-распознавание)",
      STEP_3D_AND_TT: "🧊 3D STEP + ТТ чертежа",
      STL_3D_MESH_AFR: "🧊 3D STL Mesh анализ",
      STL_3D_AND_TT: "🧊 3D STL + ТТ чертежа",
      IGES_3D_CAD_PREVIEW: "🧊 3D IGES модель",
    };
    const mBadge = document.getElementById("drwMethodBadge");
    if (mBadge) mBadge.textContent = `${drawingState.filename || "Чертёж"} · ${methodLabels[drawingState.analysisMethod] || drawingState.analysisMethod}`;

    // Preview box (2D SVG / Image / PDF / DXF Canvas / 3D CAD Stage)
    const prevWrap = document.getElementById("drwPreviewStage");
    const cad3dWrap = document.getElementById("drw3dStageWrap");
    const zoomBar = document.getElementById("drwZoomBar");
    const bar3d = document.getElementById("drw3dToolbar");
    const tele3d = document.getElementById("drw3dTelemetry");

    if (drawingState.previewType === "cad3d") {
      if (prevWrap) prevWrap.style.display = "none";
      if (cad3dWrap) cad3dWrap.style.display = "block";
      if (zoomBar) zoomBar.style.display = "none";
      if (bar3d) bar3d.style.display = "flex";
      const dlStepBtn = document.getElementById("btnDrwDlStep");
      if (dlStepBtn) dlStepBtn.style.display = drawingState.cad3dDemoKind ? "inline-block" : "none";
      if (tele3d && drawingState.cad3dSummary) {
        const c3 = drawingState.cad3dSummary;
        const ptRu = { SHAFT_TURNED: "Тело вращения", PRISMATIC_MILLED: "Корпусная / призма", MILL_TURN: "Токарно-фрезерная" }[c3.part_type] || c3.part_type;
        tele3d.style.display = "grid";
        tele3d.innerHTML = `
          <div class="drw-3d-stat"><span>Габарит 3D</span><b>${c3.bbox_x_mm} × ${c3.bbox_y_mm} × ${c3.bbox_z_mm} мм</b></div>
          <div class="drw-3d-stat"><span>Тип заготовки</span><b>${ptRu}</b></div>
          <div class="drw-3d-stat"><span>Отверстий B-Rep</span><b>${c3.internal_holes_count || 0} шт</b></div>
          <div class="drw-3d-stat"><span>Съём припуска</span><b>~${c3.removal_volume_cm3 || 0} см³</b></div>
        `;
      }
    } else {
      if (cad3dWrap) cad3dWrap.style.display = "none";
      if (bar3d) bar3d.style.display = "none";
      if (tele3d) tele3d.style.display = "none";
      if (prevWrap) {
        prevWrap.style.display = "block";
        if (drawingState.previewType === "image" && drawingState.previewUrl) {
          if (zoomBar) zoomBar.style.display = "flex";
          prevWrap.innerHTML = `<div class="drw-img-scroll"><img id="drwPreviewImg" src="${drawingState.previewUrl}" alt="Чертёж заготовки" style="width:${drawingState.zoomPct === 0 ? "100%" : drawingState.zoomPct + "%"};display:block;border-radius:8px;" /></div>`;
        } else if (drawingState.previewType === "pdf" && drawingState.previewUrl) {
          if (zoomBar) zoomBar.style.display = "none";
          prevWrap.innerHTML = `<iframe src="${drawingState.previewUrl}" style="width:100%;height:285px;border:none;border-radius:9px;background:#fff;" title="PDF чертёж"></iframe>`;
        } else if (drawingState.previewType === "dxf" && drawingState.dxfSummary) {
          if (zoomBar) zoomBar.style.display = "none";
          prevWrap.innerHTML = `<canvas id="drwDxfCanvas" style="width:100%;height:285px;display:block;border-radius:9px;"></canvas>`;
          requestAnimationFrame(() => drawDxfPreviewCanvas(document.getElementById("drwDxfCanvas"), drawingState.dxfSummary));
        } else {
          if (zoomBar) zoomBar.style.display = "none";
          prevWrap.innerHTML = `<div style="width:100%;height:285px;">${buildDemoBlueprintSVG(drawingState.previewSvgKind, spec)}</div>`;
        }
      }
    }

    // Detected features editor list
    const fList = document.getElementById("drwFeaturesList");
    if (fList) {
      fList.innerHTML = spec.features.map((f) => `
        <div class="drw-feat-row">
          <div style="flex:1;min-width:160px;">
            <div style="font-size:12.5px;font-weight:800;color:var(--text);">${f.title}</div>
            <div style="font-size:11px;color:var(--muted);">${FEATURE_KIND_LABELS[f.kind] || f.kind}${f.source === "STEP_3D" ? " · 🧊 STEP 3D" : (f.source === "STL_3D" ? " · 🧊 STL 3D" : (f.source === "DXF" ? " · DXF" : (f.source === "VISION_AI" ? " · AI" : "")))}</div>
          </div>
          <div class="drw-feat-inputs">
            <label title="Диаметр / ширина, мм"><span>Ø/W</span><input type="number" step="0.5" value="${f.diameter_mm ?? f.width_mm ?? ""}" placeholder="—" onchange="updateDrawingFeature('${f.id}','diameter_mm',this.value)"/></label>
            <label title="Длина / глубина, мм"><span>L/h</span><input type="number" step="1" value="${f.length_or_depth_mm ?? ""}" placeholder="—" onchange="updateDrawingFeature('${f.id}','length_or_depth_mm',this.value)"/></label>
            <label title="Кол-во на деталь"><span>шт</span><input type="number" min="1" value="${f.count}" onchange="updateDrawingFeature('${f.id}','count',this.value)"/></label>
            <button class="link-subtle" title="Удалить операцию" onclick="removeDrawingFeature('${f.id}')">✕</button>
          </div>
        </div>`).join("");
    }

    // Right column: Summary KPIs & Tooling Kit Cards
    const kpiEl = document.getElementById("drwKitKpis");
    if (kpiEl) {
      kpiEl.innerHTML = `
        <div class="kpi"><div class="k-label">Операций по чертежу</div><div class="k-val">${plan.total_operations}</div><div class="k-sub">партия ${spec.batch_qty} дет. · ISO ${spec.material_subgroup}</div></div>
        <div class="kpi"><div class="k-label">Наличие на складе</div><div class="k-val" style="color:var(--green);">${plan.in_stock_count} / ${plan.total_operations}</div><div class="k-sub">${plan.backorder_count ? `${plan.backorder_count} поз. под заказ` : "всё в наличии!"}</div></div>
        <div class="kpi"><div class="k-label">Пластины / свёрла</div><div class="k-val">${Math.round(plan.total_inserts_rub).toLocaleString("ru-RU")} ₽</div><div class="k-sub">на партию ${spec.batch_qty} шт</div></div>
        <div class="kpi" style="border-color:var(--accent);background:var(--accent-soft);"><div class="k-label">Итого комплект${spec.include_holders ? " + корпуса" : ""}</div><div class="k-val" style="color:var(--accent);">${Math.round(plan.grand_total_rub).toLocaleString("ru-RU")} ₽</div><div class="k-sub">${spec.include_holders ? `корпуса: ${Math.round(plan.total_holders_rub).toLocaleString("ru-RU")} ₽` : "только сменный инструмент"}</div></div>
      `;
    }

    const warnEl = document.getElementById("drwKitWarnings");
    if (warnEl) {
      if (plan.warnings && plan.warnings.length) {
        warnEl.style.display = "block";
        warnEl.innerHTML = plan.warnings.map((w) => `⚠ ${w}`).join("<br>");
      } else {
        warnEl.style.display = "none";
      }
    }

    const kitEl = document.getElementById("drwKitList");
    if (kitEl) {
      kitEl.innerHTML = plan.kit_lines.map((ln) => {
        const stockTag = ln.stock_qty > 0
          ? `<span class="stock-badge">🟢 Склад: ${ln.stock_qty} шт</span>`
          : `<span class="stock-badge out">🟡 Под заказ</span>`;
        const sharedTag = ln.shared_with_step
          ? `<span class="tag primary">Общий с Оп.${ln.shared_with_step} · 0 ₽</span>`
          : `<span class="price-edge-pill">${ln.recommended_qty} шт × ${ln.unit_price_rub.toLocaleString("ru-RU")} ₽ = ${Math.round(ln.line_total_rub).toLocaleString("ru-RU")} ₽</span>`;

        return `
          <article class="drw-kit-card">
            <div class="drw-kit-head">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <span class="drw-step-badge">Оп.${ln.step_no}</span>
                <div style="min-width:0;">
                  <div style="font-weight:800;font-size:13.5px;color:var(--text);">${ln.operation_title}</div>
                  <div style="font-size:11.5px;color:var(--muted);">${ln.feature_summary}</div>
                </div>
              </div>
              ${stockTag}
            </div>

            <div class="drw-kit-body">
              <div class="prod-thumb" style="width:44px;height:44px;">${renderInsertSVG(ln.shape_code)}</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                  <div>
                    <span class="prod-iso" style="font-size:15px;">${ln.iso_code}</span>
                    <span class="tag" style="margin-left:5px;">${ln.grade_code}</span>
                    <span class="tag">${ln.cutting_edges_count} кр.</span>
                  </div>
                  ${sharedTag}
                </div>
                <div style="font-size:12px;color:var(--text-soft);margin-top:4px;">${ln.rationale}</div>
                ${ln.pre_drill_note ? `<div class="drw-predrill-pill">🔩 ${ln.pre_drill_note}</div>` : ""}
                ${ln.holder_code ? `<div style="font-size:11.5px;color:var(--muted);margin-top:4px;">Совместимый корпус: <b style="font-family:var(--mono);color:var(--text);">${ln.holder_code}</b> (${(ln.holder_price_rub || 5500).toLocaleString("ru-RU")} ₽)</div>` : ""}
              </div>
            </div>

            <div class="prod-foot-links" style="margin-top:2px;">
              <button class="link-subtle" onclick="sendInsertToTechnologist('${ln.insert_id}')">⚙ Расчёт технологу →</button>
              <div style="display:flex;gap:6px;">
                ${ln.holder_code ? `<button class="upsell-btn" onclick="addHolderToCart('${ln.insert_id}')">+ Корпус</button>` : ""}
                <button class="upsell-btn" style="background:var(--green-soft);border-color:var(--green);color:var(--green);" onclick="addSingleKitLineToCart(${ln.step_no})">+ В заказ</button>
              </div>
            </div>
          </article>`;
      }).join("");
    }
  }

  function initDrawingModule() {
    // Populate material dropdown inside drawing tab
    const matSel = document.getElementById("drwMaterialSel");
    if (matSel && typeof FALLBACK_DB !== "undefined") {
      matSel.innerHTML = FALLBACK_DB.subgroups
        .map((s) => `<option value="${s.code}">${s.code} — ${s.name_ru}</option>`)
        .join("");
    }
    // Restore saved Gemini API key if present
    const savedKey = localStorage.getItem(GEMINI_KEY_STORAGE) || "";
    const kInp = document.getElementById("drwGeminiKeyInput");
    if (kInp && savedKey) kInp.value = savedKey;

    // Wire Drag & Drop zone
    const dz = document.getElementById("drwDropzone");
    if (dz) {
      ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("dragover"); }));
      ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("dragover"); }));
      dz.addEventListener("drop", (e) => {
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handleDrawingFile(f);
      });
    }

    // Load 3D STEP demo workpiece by default so 3D + 2D mode is immediately showcase-ready
    loadDemo3DWorkpiece("step-shaft-p1");
  }

  function handleDrawingFileInput(evt) {
    const f = evt.target.files && evt.target.files[0];
    evt.target.value = "";
    if (f) handleDrawingFile(f);
  }

  // Expose functions globally for HTML inline handlers
  global.initDrawingModule = initDrawingModule;
  global.handleDrawingFileInput = handleDrawingFileInput;
  global.loadDemoBlueprint = loadDemoBlueprint;
  global.parseNotesFromTextarea = parseNotesFromTextarea;
  global.recomputeDrawingPlan = recomputeDrawingPlan;
  global.updateDrawingFeature = updateDrawingFeature;
  global.removeDrawingFeature = removeDrawingFeature;
  global.toggleAddFeatureForm = toggleAddFeatureForm;
  global.submitAddDrawingFeature = submitAddDrawingFeature;
  global.setDrawingBatchPreset = setDrawingBatchPreset;
  global.setDrawingZoom = setDrawingZoom;
  global.toggleVisionKeyPanel = toggleVisionKeyPanel;
  global.saveGeminiVisionKey = saveGeminiVisionKey;
  global.runVisionOnCurrentImage = runVisionOnCurrentImage;
  global.addBlueprintKitToCart = addBlueprintKitToCart;
  global.addSingleKitLineToCart = addSingleKitLineToCart;
  global.renderDrawingWorkspace = renderDrawingWorkspace;
  global.loadDemo3DWorkpiece = loadDemo3DWorkpiece;
  global.downloadCurrentDemoStep = downloadCurrentDemoStep;
  global.setDrw3dView = setDrw3dView;
  global.toggleDrw3dWire = toggleDrw3dWire;
  global.toggleDrw3dAxes = toggleDrw3dAxes;
  global.renderDrw3DModel = renderDrw3DModel;
})(window);
