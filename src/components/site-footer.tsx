import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { brand, navigation } from "@/lib/brand";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border bg-surface/60">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A calmer way to find and reserve community halls, event spaces and
              grounds. Built around real availability and clear booking terms.
            </p>
            {brand.supportEmail ? (
              <a
                href={`mailto:${brand.supportEmail}`}
                className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
              >
                {brand.supportEmail}
              </a>
            ) : null}
          </div>

          <div>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">Explore</h2>
            <ul className="mt-3 space-y-2.5">
              {navigation.footer.explore.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-foreground-soft hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">Company</h2>
            <ul className="mt-3 space-y-2.5">
              {navigation.footer.company.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-foreground-soft hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">Legal</h2>
            <ul className="mt-3 space-y-2.5">
              {navigation.footer.legal.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-foreground-soft hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {brand.name}. All prices in Indian Rupees.
          </p>
          <p className="max-w-md leading-relaxed">
            Privacy, terms and refund policies are published at{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              /privacy
            </Link>
            ,{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
              /terms
            </Link>{" "}
            and{" "}
            <Link href="/refund-policy" className="underline underline-offset-4 hover:text-foreground">
              /refund-policy
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
