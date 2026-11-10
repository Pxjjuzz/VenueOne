import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { unreadNotificationCount } from "@/lib/notifications";
import { signInPath } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect(signInPath("/dashboard"));
  if (user.isSuspended) redirect("/account-suspended");

  const unread = await unreadNotificationCount(user.id).catch(() => 0);

  return (
    <AppShell user={user} unread={unread}>
      {children}
    </AppShell>
  );
}
