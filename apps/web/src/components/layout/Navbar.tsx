"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Sparkles, User, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/catalog", label: "Shop" },
  { href: "/try-on", label: "Try On" },
  { href: "/style-advisor", label: "Style Advisor" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user: storeUser } = useAuthStore();
  const { signOut } = useAuth();
  const isAuthenticated = !!storeUser;
  const { cart } = useCartStore();
  const itemCount = cart?.itemCount ?? 0;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <Sparkles className="w-6 h-6 text-purple-600" />
            VTryon
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
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
            <Link
              href="/cart"
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="p-2 text-gray-600 hover:text-gray-900">
                  <User className="w-5 h-5" />
                </Link>
                <button
                  onClick={signOut}
                  className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
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
                  href="/register"
                  className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
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
                <Link href="/login" className="flex-1 text-center text-sm py-2 border rounded-lg">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="flex-1 text-center text-sm py-2 bg-purple-600 text-white rounded-lg"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
