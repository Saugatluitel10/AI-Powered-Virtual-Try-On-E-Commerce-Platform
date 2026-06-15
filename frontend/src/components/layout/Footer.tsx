import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            VTryon
          </div>
          <p className="text-sm">
            Nepal&apos;s first AI-powered virtual try-on fashion platform.
          </p>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/catalog" className="hover:text-white transition-colors">All Products</Link></li>
            <li><Link href="/catalog?gender=womens" className="hover:text-white transition-colors">Women</Link></li>
            <li><Link href="/catalog?gender=mens" className="hover:text-white transition-colors">Men</Link></li>
            <li><Link href="/try-on" className="hover:text-white transition-colors">Virtual Try-On</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
            <li><Link href="/for-retailers" className="hover:text-white transition-colors">For Retailers</Link></li>
            <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-3">Support</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-sm text-center">
        © {new Date().getFullYear()} VTryon. All rights reserved. Made with ❤️ in Nepal.
      </div>
    </footer>
  );
}
