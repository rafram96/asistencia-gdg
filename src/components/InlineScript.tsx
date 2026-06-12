// Ejecuta un script inline en el parseo del HTML (antes del primer pintado),
// sin disparar el warning de React por renderizar <script> en cliente.
// En servidor: type="text/javascript" (se ejecuta). En cliente: "text/plain" (se ignora).
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
