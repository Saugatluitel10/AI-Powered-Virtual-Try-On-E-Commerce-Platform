import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-bright border-t border-outline-variant/20 mt-24">
      <div className="flex flex-col md:flex-row justify-between items-center max-w-[1280px] mx-auto px-6 lg:px-16 py-12">
        <div className="flex flex-col items-center md:items-start gap-4 mb-8 md:mb-0">
          <span className="font-display text-[24px] uppercase tracking-widest text-primary">VTRYON</span>
          <p className="text-on-surface-variant text-sm">
            &copy; {new Date().getFullYear()} VTryon Luxury Tech. All rights reserved.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link href="/privacy" className="text-[12px] font-bold uppercase tracking-[0.1em] text-on-surface-variant hover:text-secondary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-[12px] font-bold uppercase tracking-[0.1em] text-on-surface-variant hover:text-secondary transition-colors">Terms of Service</Link>
          <Link href="/about" className="text-[12px] font-bold uppercase tracking-[0.1em] text-on-surface-variant hover:text-secondary transition-colors">Sustainability</Link>
          <Link href="/contact" className="text-[12px] font-bold uppercase tracking-[0.1em] text-on-surface-variant hover:text-secondary transition-colors">Press</Link>
        </div>
      </div>
    </footer>
  );
}
