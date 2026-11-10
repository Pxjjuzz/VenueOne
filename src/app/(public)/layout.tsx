import { SiteHeader, type HeaderUser } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/auth/session";
import { unreadNotificationCount } from "@/lib/notifications";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  let headerUser: HeaderUser | null = null;

  if (user) {
    const unread = await unreadNotificationCount(user.id).catch(() => 0);
    headerUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ownerStatus: user.ownerStatus,
      unread,
    };
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader user={headerUser} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
