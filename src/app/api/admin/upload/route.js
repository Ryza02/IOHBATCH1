// app/api/admin/upload/route.js
import { getDB } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 500;
const COLS = [
  "`Date`", "`Time`", "`eNodeB Name`", "`Cell Name`",
  "`Traffic GB`", "`User`", "`CQI`",
  "`Site ID`", "`Sector`",
  "`EUT`", "`PRB`", "`IOH_4G Rank2 %`", "`IOH_4G Cell Availability (%)`"
];

const SPLIT_RE = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

function pickIndex(header, candidates) {
  const idx = header.findIndex(h => candidates.some(rx => rx.test(h.trim())));
  return idx >= 0 ? idx : -1;
}

function toNum(v) {
  const n = parseFloat((v ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function POST(req) {
  try {
    const db = await getDB();
    const form = await req.formData();
    const file = form.get("file");
    if (!file) return NextResponse.json({ ok: false, message: "File tidak ada" }, { status: 400 });

    const decoder = new TextDecoder();
    let leftover = "";
    let header = null;
    let idx = null;
    let placeholders = [], params = [];
    let inserted = 0, skipped = 0;

    const flush = async () => {
      if (placeholders.length === 0) return;
      const sql = `
        INSERT INTO \`kpi_raw\` (${COLS.join(",")})
        VALUES ${placeholders.join(",")}
        ON DUPLICATE KEY UPDATE
          \`eNodeB Name\`=VALUES(\`eNodeB Name\`),
          \`Cell Name\`=VALUES(\`Cell Name\`),
          \`Traffic GB\`=VALUES(\`Traffic GB\`),
          \`User\`=VALUES(\`User\`),
          \`CQI\`=VALUES(\`CQI\`),
          \`Site ID\`=VALUES(\`Site ID\`),
          \`Sector\`=VALUES(\`Sector\`),
          \`EUT\`=VALUES(\`EUT\`),
          \`PRB\`=VALUES(\`PRB\`),
          \`IOH_4G Rank2 %\`=VALUES(\`IOH_4G Rank2 %\`),
          \`IOH_4G Cell Availability (%)\`=VALUES(\`IOH_4G Cell Availability (%)\`)
      `;
      await db.query(sql, params);
      inserted += placeholders.length;
      placeholders = [];
      params = [];
    };

    function parseHeader(line) {
      const raw = line.split(SPLIT_RE).map(s => s.replace(/^"|"$/g, ""));
      const norm = raw.map(s => s.trim());
      const rx = s => new RegExp(`^${s}$`, "i");
      idx = {
        Date:    pickIndex(norm, [rx("date")]),
        Time:    pickIndex(norm, [rx("time")]),
        eNodeB:  pickIndex(norm, [/^e(nodeb)?\s*name$/i]),
        Cell:    pickIndex(norm, [/^cell\s*name$/i]),
        Traffic: pickIndex(norm, [/^traffic\s*gb$/i]),
        User:    pickIndex(norm, [/^user$/i]),
        CQI:     pickIndex(norm, [/^cqi$/i]),
        Site:    pickIndex(norm, [/^site\s*id$/i]),
        Sector:  pickIndex(norm, [/^sector$/i]),
        EUT:     pickIndex(norm, [/^eut$/i]),
        PRB:     pickIndex(norm, [/^prb/i]),
        Rank2:   pickIndex(norm, [/rank2/i]),
        Avail:   pickIndex(norm, /(availability|avail)/i),
      };
      if (idx.Date < 0 || idx.Time < 0 || idx.Site < 0 || idx.Sector < 0) {
        throw new Error("Header harus berisi: Date, Time, Site ID, Sector");
      }
    }

    function handleLine(line) {
      if (!line) return;
      if (!header) { header = line; parseHeader(line); return; }
      const cols = line.split(SPLIT_RE).map(s => s.replace(/^"|"$/g, "").trim());
      const vals = [
        cols[idx.Date] || null,
        cols[idx.Time] || null,
        idx.eNodeB >= 0 ? cols[idx.eNodeB] : null,
        idx.Cell   >= 0 ? cols[idx.Cell]   : null,
        idx.Traffic >= 0 ? toNum(cols[idx.Traffic]) : null,
        idx.User    >= 0 ? toNum(cols[idx.User])    : null,
        idx.CQI     >= 0 ? toNum(cols[idx.CQI])     : null,
        idx.Site    >= 0 ? cols[idx.Site]    : null,
        idx.Sector  >= 0 ? cols[idx.Sector]  : null,
        idx.EUT     >= 0 ? toNum(cols[idx.EUT])     : null,
        idx.PRB     >= 0 ? toNum(cols[idx.PRB])     : null,
        idx.Rank2   >= 0 ? toNum(cols[idx.Rank2])   : null,
        idx.Avail   >= 0 ? toNum(cols[idx.Avail])   : null,
      ];
      if (!vals[0] || !vals[1]) { skipped++; return; }
      placeholders.push("(" + COLS.map(() => "?").join(",") + ")");
      params.push(...vals);
      if (placeholders.length >= BATCH_SIZE) return flush();
    }

    for await (const chunk of file.stream()) {
      const text = decoder.decode(chunk, { stream: true });
      const pieces = (leftover + text).split(/\r?\n/);
      leftover = pieces.pop() || "";
      for (const ln of pieces) await handleLine(ln);
    }
    if (leftover) await handleLine(leftover);
    await flush();

    return NextResponse.json({ ok: true, inserted, skipped });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ ok: false, message: e.message || "Upload gagal" }, { status: 500 });
  }
}