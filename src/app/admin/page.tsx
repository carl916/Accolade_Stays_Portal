import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function AdminPage() {
  await requireRole(["administrator"]);

  redirect("/admin/jobs");
}
