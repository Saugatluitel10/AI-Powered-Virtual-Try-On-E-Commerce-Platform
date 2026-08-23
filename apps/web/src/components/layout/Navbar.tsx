"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/hooks/useAuth";
import CartDrawer from "@/components/cart/CartDrawer";

const links = [{ href: "/shop", label: "Shop" }, { href: "/stylist", label: "Style Match" }];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((state) => state.user);
  const count = useCartStore((state) => state.getItemCount());
  const visibleCount = mounted ? count : 0;
  const { signOut } = useAuth();
  useEffect(() => setMounted(true), []);
  return <>
    <header className="nepal-nav sticky top-0 z-40 border-b border-black/10 bg-[#f8f7f3]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-8">
        <Link href="/" className="font-display text-2xl font-bold" aria-label="prashna.clo home">prashna<span className="text-[#b61f32]">.clo</span></Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => <Link key={link.href} href={link.href} className={`text-xs font-bold uppercase ${pathname.startsWith(link.href) ? "text-[#b61f32]" : "hover:text-[#b61f32]"}`}>{link.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setCartOpen(true)} className="relative grid h-10 w-10 place-items-center" aria-label={`Cart with ${visibleCount} items`}><ShoppingBag className="h-5 w-5" />{visibleCount > 0 && <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#b61f32] px-1 text-[10px] text-white">{visibleCount}</span>}</button>
          {user ? <><Link href="/orders" className="hidden text-xs font-bold sm:block">Hi, {user.name.split(" ")[0]}</Link><button onClick={async () => { await signOut(); router.push("/login"); }} className="grid h-10 w-10 place-items-center" title="Log out"><LogOut className="h-5 w-5" /></button></> : <Link href="/login" className="grid h-10 w-10 place-items-center" title="Sign in"><User className="h-5 w-5" /></Link>}
          <button className="grid h-10 w-10 place-items-center md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      {menuOpen && <nav className="border-t border-black/10 px-4 py-3 md:hidden">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-bold uppercase">{link.label}</Link>)}</nav>}
    </header>
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
  </>;
}
