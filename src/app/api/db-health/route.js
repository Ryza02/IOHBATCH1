  import { getDB } from "@/lib/db";
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  export async function GET() {
    const db = await getDB();
    try {
      const [okRow] = await db.query("SELECT 1 AS ok");
      const [mm] = await db.query(
        "SELECT MIN(`Date`) AS minDate, MAX(`Date`) AS maxDate FROM `kpi_raw`"
      );
      return new Response(JSON.stringify({
        ok: okRow?.[0]?.ok === 1,
        minDate: mm?.[0]?.minDate || null,
        maxDate: mm?.[0]?.maxDate || null,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
    }
  }
