"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Sparkles, User, Menu, X, LogOut, Bell } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import CartDrawer from "@/components/cart/CartDrawer";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/stylist", label: "AI Stylist" },
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

  // Close mobile menu on Escape
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
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl text-gray-900"
              aria-label="VTryon — Go to homepage"
            >
              <Sparkles className="w-6 h-6 text-purple-600" aria-hidden="true" />
              VTryon
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8" role="menubar">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    pathname.startsWith(link.href)
                      ? "text-purple-600"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />

              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} item${itemCount > 1 ? "s" : ""}` : ", empty"}`}
              >
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                {itemCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/notifications"
                    className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                    aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                  >
                    <Bell className="w-5 h-5" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profile"
                    className="p-2 text-gray-600 hover:text-gray-900"
                    aria-label="Profile"
                  >
                    <User className="w-5 h-5" aria-hidden="true" />
                  </Link>
                  <button
                    onClick={signOut}
                    className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                    aria-label="Log out"
                  >
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-gray-600"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
              >
                {mobileOpen ? (
                  <X className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Menu className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div
              id="mobile-menu"
              className="md:hidden py-4 border-t border-gray-100 space-y-2"
              role="menu"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={closeMobile}
                  aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                  className={cn(
                    "block px-2 py-2 text-sm font-medium rounded-md",
                    pathname.startsWith(link.href)
                      ? "text-purple-600 bg-purple-50"
                      : "text-gray-600"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <div className="flex gap-2 pt-2">
                  <Link
                    href="/login"
                    className="flex-1 text-center text-sm py-2 border rounded-lg"
                    onClick={closeMobile}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex-1 text-center text-sm py-2 bg-purple-600 text-white rounded-lg"
                    onClick={closeMobile}
                  >
                    Sign up
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
