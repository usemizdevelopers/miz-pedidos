import { Mrs_Saint_Delafield } from "next/font/google";
import "@/components/pdf/pdf.css";

// Cursiva gratuita no lugar da "Hello Paris Script" do Canva (licenciada) até termos o arquivo.
const cursiva = Mrs_Saint_Delafield({ variable: "--font-cursiva", subsets: ["latin"], weight: "400" });

export default function ImpressaoLayout({ children }: LayoutProps<"/impressao">) {
  return <div className={cursiva.variable}>{children}</div>;
}
