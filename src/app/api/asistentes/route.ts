import { NextRequest, NextResponse } from "next/server";
import { asistentesData, buscarAsistentes } from "@/lib/asistentes";

// GET /api/asistentes?q=texto&tipo=Ponente
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const tipo = searchParams.get("tipo") ?? undefined;

  const resultados = buscarAsistentes(q, tipo);

  return NextResponse.json({
    evento: asistentesData.evento,
    total: resultados.length,
    asistentes: resultados,
  });
}
