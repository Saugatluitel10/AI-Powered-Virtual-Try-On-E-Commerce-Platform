import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2"><div className="relative hidden lg:block"><Image src="/products/product-05.jpg" alt="prashna.clo clothing" fill priority className="object-cover" sizes="50vw" /><Link href="/" className="absolute left-8 top-8 bg-white px-4 py-2 font-display text-2xl font-bold">prashna<span className="text-[#b61f32]">.clo</span></Link></div><section className="flex items-center justify-center bg-white px-5 py-16"><div className="w-full max-w-md">{children}</div></section></div>;
}
