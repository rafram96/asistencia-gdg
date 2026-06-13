import { NextRequest, NextResponse } from "next/server";
import { asistentesData } from "@/lib/asistentes";
import {
  getContabilizados,
  setContabilizado,
  resetContabilizados,
} from "@/lib/contabilizados";

// GET /api/contabilizados -> { ids, count, total }
export async function GET() {
  const ids = await getContabilizados();
  return NextResponse.json({
    ids,
    count: ids.length,
    total: asistentesData.total,
  });
}

// POST /api/contabilizados  body: { id: number, contabilizado: boolean }
export async function POST(req: NextRequest) {
  let body: { id?: unknown; contabilizado?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = body.id;
  const contabilizado = body.contabilizado;

  if (typeof id !== "number" || !Number.isInteger(id) || id < 0 || id >= asistentesData.total) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  if (typeof contabilizado !== "boolean") {
    return NextResponse.json({ error: "contabilizado debe ser boolean" }, { status: 400 });
  }

  const { ids, count } = await setContabilizado(id, contabilizado);
  return NextResponse.json({ ids, count, total: asistentesData.total });
}

// DELETE /api/contabilizados  -> reinicia el conteo (borra todos los marcados)
export async function DELETE() {
  await resetContabilizados();
  return NextResponse.json({ ids: [], count: 0, total: asistentesData.total });
}
