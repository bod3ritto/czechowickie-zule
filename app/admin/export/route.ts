import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { exportAll } from "@/lib/queries/admin";

/** Full JSON export of the database (admins only). */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  try {
    const data = await exportAll();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="czechowickie-zule-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Eksport nie powiódł się." }, { status: 500 });
  }
}
