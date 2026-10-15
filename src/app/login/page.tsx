import { LogoMiz } from "@/components/logo";
import { FormLogin } from "./form-login";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <LogoMiz className="text-5xl" />
          <p className="mt-2 text-sm text-suave">Simulações e pedidos</p>
        </div>
        {erro === "inativa" && (
          <p className="mb-4 rounded-lg bg-erro/10 px-3 py-2 text-sm text-erro">
            Seu acesso está desativado. Fale com o admin.
          </p>
        )}
        <FormLogin />
      </div>
    </main>
  );
}
