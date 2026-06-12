"use client";

import { useEffect, useMemo, useState } from "react";
import { asistentesData, type Asistente } from "@/lib/asistentes";
import ThemeToggle from "@/components/ThemeToggle";

const TIPOS = ["Todos", "Organización", "Ponente", "Voluntarios", "Asistente"] as const;
const ESTADOS = ["Todos", "Contabilizados", "Pendientes"] as const;

const TIPO_COLOR: Record<string, string> = {
  Organización: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Ponente: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Voluntarios: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Asistente: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

export default function Home() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("Todos");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("Todos");

  const [contabilizados, setContabilizados] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<Set<number>>(new Set());

  // Asistente pendiente de confirmar en el modal.
  const [confirmar, setConfirmar] = useState<Asistente | null>(null);

  // Carga inicial del estado desde el backend.
  useEffect(() => {
    fetch("/api/contabilizados")
      .then((r) => r.json())
      .then((d: { ids: number[] }) => setContabilizados(new Set(d.ids)))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  async function toggle(a: Asistente) {
    const nuevo = !contabilizados.has(a.id);
    // Actualización optimista.
    setContabilizados((prev) => {
      const next = new Set(prev);
      if (nuevo) next.add(a.id);
      else next.delete(a.id);
      return next;
    });
    setGuardando((prev) => new Set(prev).add(a.id));
    try {
      const res = await fetch("/api/contabilizados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, contabilizado: nuevo }),
      });
      if (!res.ok) throw new Error("error");
      const d: { ids: number[] } = await res.json();
      setContabilizados(new Set(d.ids));
    } catch {
      // Revertir en caso de fallo.
      setContabilizados((prev) => {
        const next = new Set(prev);
        if (nuevo) next.delete(a.id);
        else next.add(a.id);
        return next;
      });
    } finally {
      setGuardando((prev) => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
    }
  }

  const resultados = useMemo<Asistente[]>(() => {
    const needle = q.trim().toLowerCase();
    return asistentesData.asistentes.filter((a) => {
      if (tipo !== "Todos" && a.tipo !== tipo) return false;
      if (estado === "Contabilizados" && !contabilizados.has(a.id)) return false;
      if (estado === "Pendientes" && contabilizados.has(a.id)) return false;
      if (!needle) return true;
      const hay = `${a.nombre ?? ""} ${a.apellido ?? ""} ${a.dni ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [q, tipo, estado, contabilizados]);

  const conteoPorTipo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of asistentesData.asistentes) {
      const t = a.tipo ?? "—";
      c[t] = (c[t] ?? 0) + 1;
    }
    return c;
  }, []);

  // Cerrar el modal con la tecla Escape.
  useEffect(() => {
    if (!confirmar) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmar(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmar]);

  const total = asistentesData.total;
  const nContabilizados = contabilizados.size;
  const pct = total ? Math.round((nContabilizados / total) * 100) : 0;

  const badgeTipo = (a: Asistente) => (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        TIPO_COLOR[a.tipo ?? ""] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800"
      }`}
    >
      {a.tipo ?? "—"}
    </span>
  );

  const botonEstado = (a: Asistente, full = false) => {
    const marcado = contabilizados.has(a.id);
    return (
      <button
        onClick={() => setConfirmar(a)}
        disabled={guardando.has(a.id)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          full ? "w-full" : ""
        } ${
          marcado
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border border-zinc-300 text-zinc-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-300"
        }`}
      >
        {marcado ? "✓ CONTABILIZADO" : "Contabilizar"}
      </button>
    );
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:py-10">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-600 dark:text-sky-400">Asistencias GDG</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{asistentesData.evento}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} registros ·{" "}
            {Object.entries(conteoPorTipo)
              .map(([t, n]) => `${n} ${t}`)
              .join(" · ")}
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* Tarjeta de conteo */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Contabilizados</p>
            <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {nContabilizados}
              <span className="text-lg font-medium text-zinc-400"> / {total}</span>
            </p>
          </div>
          <p className="text-sm font-medium text-zinc-500">
            {pct}% · {total - nContabilizados} pendientes
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, apellido o DNI…"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as (typeof ESTADOS)[number])}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {ESTADOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-3 text-sm text-zinc-500">
        {resultados.length} resultado(s){cargando && " · cargando estado…"}
      </p>

      {/* Tabla — solo en pantallas medianas y grandes */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 md:block dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60">
            <tr>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Apellido</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((a) => (
              <tr
                key={a.id}
                className={`border-t border-zinc-100 dark:border-zinc-800 ${
                  contabilizados.has(a.id)
                    ? "bg-emerald-50/60 dark:bg-emerald-900/10"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{a.dni ?? "—"}</td>
                <td className="px-4 py-2.5">{a.apellido ?? "—"}</td>
                <td className="px-4 py-2.5">{a.nombre ?? "—"}</td>
                <td className="px-4 py-2.5">{badgeTipo(a)}</td>
                <td className="px-4 py-2.5 text-right">{botonEstado(a)}</td>
              </tr>
            ))}
            {resultados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas — solo en móvil */}
      <div className="flex flex-col gap-3 md:hidden">
        {resultados.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl border p-4 ${
              contabilizados.has(a.id)
                ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-900/10"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium leading-tight">
                  {a.nombre ?? ""} {a.apellido ?? ""}
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">DNI {a.dni ?? "—"}</p>
              </div>
              {badgeTipo(a)}
            </div>
            <div className="mt-3">{botonEstado(a, true)}</div>
          </div>
        ))}
        {resultados.length === 0 && (
          <p className="rounded-xl border border-zinc-200 py-10 text-center text-zinc-400 dark:border-zinc-800">
            Sin resultados
          </p>
        )}
      </div>

      <footer className="mt-8 text-center text-xs text-zinc-400">
        API: <code className="font-mono">/api/asistentes</code> ·{" "}
        <code className="font-mono">/api/contabilizados</code>
      </footer>

      {/* Modal de confirmación para evitar marcar por error */}
      {confirmar &&
        (() => {
          const yaMarcado = contabilizados.has(confirmar.id);
          return (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setConfirmar(null)}
            >
              <div
                className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-semibold">
                  {yaMarcado ? "¿Quitar de contabilizados?" : "¿Contabilizar a esta persona?"}
                </h2>
                <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
                  <p className="font-medium">
                    {confirmar.nombre ?? ""} {confirmar.apellido ?? ""}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">
                    DNI {confirmar.dni ?? "—"} · {confirmar.tipo ?? "—"}
                  </p>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmar(null)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    autoFocus
                    onClick={() => {
                      const a = confirmar;
                      setConfirmar(null);
                      toggle(a);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      yaMarcado
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {yaMarcado ? "Sí, quitar" : "Sí, contabilizar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </main>
  );
}
