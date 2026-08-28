"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ReceiptText,
  CreditCard,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import type { Institute } from "@/lib/types";

const links = [
  { href: "/institute", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/institute/courses", label: "Courses", icon: BookOpen, exact: false },
  { href: "/institute/students", label: "Students", icon: Users, exact: false },
  { href: "/institute/orders", label: "Sales", icon: ReceiptText, exact: false },
  { href: "/institute/billing", label: "Billing", icon: CreditCard, exact: false },
];

export function InstituteShell({
  institute,
  children,
}: {
  institute: Institute | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-slate-900">
            {institute?.name || "Institute"}
          </h1>
        </div>
        {institute && (
          <p className="text-sm text-slate-500 mb-4">
            {institute.subscriptionStatus === "active" ? (
              <span className="text-emerald-600">
                Subscription active
                {institute.planExpiresAt?.toDate
                  ? ` · renews ${institute.planExpiresAt.toDate().toLocaleDateString()}`
                  : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {institute.subscriptionStatus} — selling is paused
              </span>
            )}
          </p>
        )}

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