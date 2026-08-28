"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Building2,
  ReceiptText,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";

const links = [
  { href: "/super", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/super/plans", label: "Plans", icon: Package, exact: false },
  { href: "/super/institutes", label: "Institutes", icon: Building2, exact: false },
  { href: "/super/orders", label: "Orders", icon: ReceiptText, exact: false },
  { href: "/super/payouts", label: "Payouts", icon: Wallet, exact: false },
];

export function SuperShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
        </div>

        <nav className="flex flex-wrap gap-2 mb-8">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-slate-900"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </main>
  );
}