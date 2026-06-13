import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

// Almacén de estado de check-in.
//
// - En producción (Vercel) el sistema de archivos es de solo lectura, así que
//   se usa Upstash Redis cuando están definidas las variables de entorno.
// - En desarrollo local, si no hay credenciales de Upstash, cae a un archivo
//   JSON dentro del repo (cero configuración para correr `npm run dev`).

const REDIS_KEY = "asistencias-gdg:contabilizados";

const usaRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = usaRedis ? Redis.fromEnv() : null;

function ordenar(ids: number[]): number[] {
  return [...new Set(ids)].sort((a, b) => a - b);
}

/* ---------- Implementación Redis (Vercel) ---------- */

async function redisGet(): Promise<number[]> {
  const ids = await redis!.smembers(REDIS_KEY);
  return ordenar(ids.map(Number).filter((n) => Number.isInteger(n)));
}

async function redisSet(id: number, contabilizado: boolean) {
  if (contabilizado) await redis!.sadd(REDIS_KEY, id);
  else await redis!.srem(REDIS_KEY, id);
  return { ids: await redisGet() };
}

/* ---------- Implementación archivo (dev local) ---------- */

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "contabilizados.json");

// Serializa las escrituras para evitar carreras en el read-modify-write.
let writeChain: Promise<unknown> = Promise.resolve();

async function fileRead(): Promise<Set<number>> {
  try {
    const txt = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(txt) as { ids?: number[] };
    return new Set(Array.isArray(parsed.ids) ? parsed.ids : []);
  } catch {
    return new Set();
  }
}

async function fileWrite(ids: Set<number>): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify({ ids: ordenar([...ids]) }, null, 2), "utf-8");
}

async function fileSet(id: number, contabilizado: boolean) {
  const result = writeChain.then(async () => {
    const ids = await fileRead();
    if (contabilizado) ids.add(id);
    else ids.delete(id);
    await fileWrite(ids);
    return { ids: ordenar([...ids]) };
  });
  writeChain = result.catch(() => undefined);
  return result;
}

/* ---------- API pública ---------- */

export async function getContabilizados(): Promise<number[]> {
  return usaRedis ? redisGet() : ordenar([...(await fileRead())]);
}

export async function setContabilizado(
  id: number,
  contabilizado: boolean,
): Promise<{ ids: number[]; count: number }> {
  const { ids } = usaRedis ? await redisSet(id, contabilizado) : await fileSet(id, contabilizado);
  return { ids, count: ids.length };
}

// Borra todo el conteo (reset del evento).
export async function resetContabilizados(): Promise<void> {
  if (usaRedis) {
    await redis!.del(REDIS_KEY);
  } else {
    await writeChain.then(() => fileWrite(new Set()));
  }
}
