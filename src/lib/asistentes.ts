import data from "@/data/asistentes.json";

export type Tipo = "Organización" | "Ponente" | "Voluntarios" | "Asistente";

export interface Asistente {
  id: number;
  dni: string | null;
  apellido: string | null;
  nombre: string | null;
  tipo: string | null;
}

interface RawAsistentesData {
  evento: string;
  total: number;
  asistentes: Omit<Asistente, "id">[];
}

export interface AsistentesData {
  evento: string;
  total: number;
  asistentes: Asistente[];
}

const raw = data as RawAsistentesData;

// El id es la posición en el JSON: estable mientras no se reordene el archivo.
export const asistentesData: AsistentesData = {
  evento: raw.evento,
  total: raw.total,
  asistentes: raw.asistentes.map((a, id) => ({ id, ...a })),
};

export function getAsistentes(): Asistente[] {
  return asistentesData.asistentes;
}

export function buscarAsistentes(query: string, tipo?: string): Asistente[] {
  const q = query.trim().toLowerCase();
  return getAsistentes().filter((a) => {
    if (tipo && a.tipo !== tipo) return false;
    if (!q) return true;
    const haystack = `${a.nombre ?? ""} ${a.apellido ?? ""} ${a.dni ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}
