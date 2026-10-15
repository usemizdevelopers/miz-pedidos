import { exigirAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await exigirAdmin();
  return children;
}
