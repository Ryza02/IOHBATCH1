import { getDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDB();

  try {
    // Cari tanggal terakhir
    const [maxDateRows] = await db.query(
      "SELECT MAX(`Date`) AS last_date FROM `kpi_raw`"
    );
    const lastDate = maxDateRows?.[0]?.last_date;
    const todayISO = new Date().toISOString().slice(0, 10);
    const lastISO = lastDate ? formatDateISO(lastDate) : null;
    const todayTotalLabel =
      lastISO && todayISO === lastISO ? "Hari Ini" : `Terakhir (${lastISO || "-"})`;

    // Total hari terakhir
    const [todayRows] = await db.query(
      `
      SELECT ROUND(SUM(CAST(\`Traffic GB\` AS DECIMAL(24,6))), 2) AS total
      FROM \`kpi_raw\`
      WHERE \`Date\` = ?
      `,
      [lastDate]
    );
    const todayTotal = Number(todayRows?.[0]?.total ?? 0);

    // 🔥 Total all-time pakai SUM dari total harian (match Excel pivot)
    const [totalRows] = await db.query(`
      SELECT ROUND(SUM(day_total), 2) AS total
      FROM (
        SELECT ROUND(SUM(CAST(\`Traffic GB\` AS DECIMAL(24,6))), 2) AS day_total
        FROM \`kpi_raw\`
        GROUP BY \`Date\`
      ) t
    `);
    const totalGb = Number(totalRows?.[0]?.total ?? 0);

    // Rata-rata per hari
    const [avgRows] = await db.query(`
      SELECT ROUND(AVG(day_total), 2) AS avg
      FROM (
        SELECT ROUND(SUM(CAST(\`Traffic GB\` AS DECIMAL(24,6))), 2) AS day_total
        FROM \`kpi_raw\`
        GROUP BY \`Date\`
      ) t
    `);
    const avgGs = Number(avgRows?.[0]?.avg ?? 0);

    // Total Site
    const [siteRows] = await db.query(
      "SELECT COUNT(DISTINCT `Site ID`) AS total FROM `kpi_raw`"
    );
    const totalSite = Number(siteRows?.[0]?.total ?? 0);

    return new Response(
      JSON.stringify({
        todayTotal,
        todayTotalLabel,
        totalGb,
        avgGs,
        totalSite,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function formatDateISO(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
}
