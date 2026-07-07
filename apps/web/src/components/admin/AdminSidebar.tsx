"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Store,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="w-64 bg-primary min-h-screen flex flex-col border-r border-on-primary/10">
      <div className="p-6 border-b border-on-primary/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary flex items-center justify-center">
            <Store className="w-4 h-4 text-on-secondary" />
          </div>
          <div>
            <span className="font-display text-lg text-on-primary tracking-wider">
              VTryon
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-on-primary/40">
              Admin Panel
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-primary/30 px-3 mb-3">
          Management
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] transition-all ${
                isActive
                  ? "bg-on-primary/10 text-on-primary"
                  : "text-on-primary/50 hover:text-on-primary hover:bg-on-primary/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-on-primary/10">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-on-primary/50 hover:text-on-primary transition-colors mb-1"
        >
          <Store className="w-4 h-4" />
          View Store
        </Link>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-on-primary/50 hover:text-error transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
