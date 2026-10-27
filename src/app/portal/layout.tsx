import { redirect } from "next/navigation";
import { getAccess } from "@/lib/rbac/server";
import PortalShell from "@/components/portal/PortalShell";

export const metadata = {
  title: "پنل کاربری | اسپیرولینا مایا",
  robots: { index: false, follow: false },
};

// One shell for every role; the sidebar is built from the user's permissions
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  if (!access) redirect("/login?redirect=/portal");

  return (
    <PortalShell user={{ name: access.name, phone: access.phone, roleNames: access.roleNames }} permissions={access.tokens}>
      {children}
    </PortalShell>
  );
}
