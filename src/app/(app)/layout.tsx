import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { LogoMiz } from "@/components/logo";
import { sair } from "@/app/login/actions";

const MENU_ADMIN = [
  { href: "/admin/painel", rotulo: "Painel" },
  { href: "/simulacoes", rotulo: "Simulações e pedidos" },
  { href: "/admin/pecas", rotulo: "Peças" },
  { href: "/admin/grades", rotulo: "Grades" },
  { href: "/admin/condicoes", rotulo: "Condições" },
  { href: "/admin/vendedoras", rotulo: "Vendedoras" },
  { href: "/admin/modelo", rotulo: "Modelo do PDF" },
];

const MENU_VENDEDORA = [{ href: "/simulacoes", rotulo: "Simulações e pedidos" }];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const perfil = await exigirUsuario();
  const menu = perfil.papel === "admin" ? MENU_ADMIN : MENU_VENDEDORA;

  return (
    <>
      <header className="border-b border-linha bg-fundo">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4">
          <Link href="/">
            <LogoMiz className="text-3xl" />
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-taupe-escuro">
            {menu.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-texto">
                {item.rotulo}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/conta" className="text-suave hover:text-texto">
              {perfil.nome || perfil.email}
              <span className="ml-2 rounded-full border border-linha px-2 py-0.5 text-xs">
                {perfil.papel === "admin" ? "Admin" : "Vendedora"}
              </span>
            </Link>
            <form action={sair}>
              <button type="submit" className="text-suave underline-offset-4 hover:text-texto hover:underline">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
