"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User, Menu, X, LogOut, Bell, Shield } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import CartDrawer from "@/components/cart/CartDrawer";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const navLinks = [
  { href: "/shop", label: "Collections" },
  { href: "/stylist", label: "AI Stylist" },
  { href: "/wardrobe", label: "Showroom" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const pathname = usePathname();
  const { user: storeUser } = useAuthStore();
  const { signOut } = useAuth();
  const isAuthenticated = !!storeUser;
  const itemCount = useCartStore((s) => s.getItemCount());
  const [unreadCount, setUnreadCount] = useState(0);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCount = () => {
      api
        .get<{ data: { count: number } }>("/notifications/unread-count")
        .then((res) => setUnreadCount(res.data.data.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      <nav
        className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30"
        aria-label="Main navigation"
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <div className="flex items-center justify-between h-20">
            <Link
              href="/"
              className="font-display text-[28px] tracking-tighter text-primary leading-none"
              aria-label="VTryon — Go to homepage"
            >
              VTryon
            </Link>

            <div className="hidden md:flex items-center gap-10" role="menubar">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                  className={cn(
                    "text-[12px] font-bold uppercase tracking-[0.1em] transition-colors",
                    pathname.startsWith(link.href)
                      ? "text-primary border-b border-primary pb-0.5"
                      : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-5">
              <LanguageSwitcher />

              <button
                onClick={() => setCartOpen(true)}
                className="relative p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} item${itemCount > 1 ? "s" : ""}` : ", empty"}`}
              >
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                {itemCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 bg-secondary text-on-secondary text-[10px] rounded-full w-4 h-4 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              <Link
                href="/admin/login"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant/50 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary hover:border-primary transition-all"
                aria-label="Admin Panel"
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Admin</span>
              </Link>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/notifications"
                    className="relative p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                    aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                  >
                    <Bell className="w-5 h-5" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 bg-error text-on-error text-[10px] rounded-full w-4 h-4 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/profile" className="p-1.5 text-on-surface-variant hover:text-primary" aria-label="Profile">
                    <User className="w-5 h-5" aria-hidden="true" />
                  </Link>
                  <button onClick={signOut} className="p-1.5 text-on-surface-variant hover:text-error transition-colors" aria-label="Log out">
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-5">
                  <Link
                    href="/login"
                    className="text-[12px] font-bold uppercase tracking-[0.1em] text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="text-[12px] font-bold uppercase tracking-[0.1em] bg-primary text-on-primary px-7 py-2.5 hover:opacity-90 transition-all active:scale-95"
                  >
                    Join Now
                  </Link>
                </div>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-1.5 text-on-surface-variant"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div id="mobile-menu" className="md:hidden py-6 border-t border-outline-variant/30 space-y-3" role="menu">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={closeMobile}
                  className={cn(
                    "block py-2 text-[12px] font-bold uppercase tracking-[0.1em]",
                    pathname.startsWith(link.href) ? "text-primary" : "text-on-surface-variant"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <div className="flex gap-3 pt-4">
                  <Link href="/login" onClick={closeMobile} className="flex-1 text-center text-[12px] font-bold uppercase tracking-[0.1em] py-3 border border-outline-variant">
                    Sign In
                  </Link>
                  <Link href="/signup" onClick={closeMobile} className="flex-1 text-center text-[12px] font-bold uppercase tracking-[0.1em] py-3 bg-primary text-on-primary">
                    Join Now
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
