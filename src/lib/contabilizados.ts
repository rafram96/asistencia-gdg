import { promises as fs } from "fs";
import path from "path";

// Almacén de estado de check-in. Persiste en un archivo JSON dentro del repo
// para que el conteo sea autoritativo y sobreviva recargas / reinicios.
const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "contabilizados.json");

interface StoreShape {
  ids: number[];
}

// Serializa las escrituras para evitar carreras en el read-modify-write.
let writeChain: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<Set<number>> {
  try {
    const txt = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(txt) as StoreShape;
    return new Set(Array.isArray(parsed.ids) ? parsed.ids : []);
  } catch {
    return new Set();
  }
}

async function writeStore(ids: Set<number>): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  const body: StoreShape = { ids: [...ids].sort((a, b) => a - b) };
  await fs.writeFile(STORE_FILE, JSON.stringify(body, null, 2), "utf-8");
}

export async function getContabilizados(): Promise<number[]> {
  return [...(await readStore())].sort((a, b) => a - b);
}

export async function setContabilizado(
  id: number,
  contabilizado: boolean,
): Promise<{ ids: number[]; count: number }> {
  const result = writeChain.then(async () => {
    const ids = await readStore();
    if (contabilizado) ids.add(id);
    else ids.delete(id);
    await writeStore(ids);
    return { ids: [...ids].sort((a, b) => a - b), count: ids.size };
  });
  // Mantiene la cadena viva aunque una operación falle.
  writeChain = result.catch(() => undefined);
  return result;
}
