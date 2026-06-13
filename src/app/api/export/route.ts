import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { asistentesData } from "@/lib/asistentes";
import { getContabilizados } from "@/lib/contabilizados";

// GET /api/export -> descarga un .xlsx con el estado actual de contabilizados.
export async function GET() {
  const marcados = new Set(await getContabilizados());

  const wb = new ExcelJS.Workbook();
  wb.creator = "Asistencias GDG";
  const ws = wb.addWorksheet("Asistencias");

  ws.columns = [
    { header: "DNI", key: "dni", width: 14 },
    { header: "Apellido", key: "apellido", width: 28 },
    { header: "Nombre", key: "nombre", width: 24 },
    { header: "Tipo", key: "tipo", width: 16 },
    { header: "Contabilizado", key: "cont", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = "A1:E1";

  for (const a of asistentesData.asistentes) {
    ws.addRow({
      dni: a.dni ?? "",
      apellido: a.apellido ?? "",
      nombre: a.nombre ?? "",
      tipo: a.tipo ?? "",
      cont: marcados.has(a.id) ? "Sí" : "No",
    });
  }

  const buffer = await wb.xlsx.writeBuffer();

  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `asistencias-gdg-${fecha}-${marcados.size}contabilizados.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
