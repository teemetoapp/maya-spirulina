import { redirect } from "next/navigation";
import { getAccess } from "@/lib/rbac/server";
import { getLandingSection } from "@/lib/portal/sections";

export default async function PortalIndex() {
  const access = await getAccess();
  if (!access) redirect("/login?redirect=/portal");
  redirect(`/portal/${getLandingSection(access.tokens)}`);
}
