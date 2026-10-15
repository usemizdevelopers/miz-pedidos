export function SeloStatus({ status, numero, vencida }: { status: "simulacao" | "confirmado"; numero: string | null; vencida: boolean }) {
  if (status === "confirmado") {
    return <span className="rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok">Pedido {numero}</span>;
  }
  if (vencida) {
    return <span className="rounded-full bg-erro/10 px-2.5 py-1 text-xs font-bold tracking-wide text-erro">VENCIDA</span>;
  }
  return <span className="rounded-full border border-linha px-2.5 py-1 text-xs font-semibold text-taupe-escuro">Simulação</span>;
}
