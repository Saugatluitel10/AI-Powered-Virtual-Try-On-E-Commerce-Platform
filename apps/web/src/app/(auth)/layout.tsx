export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="grid grid-cols-1 lg:grid-cols-2 w-full">
        {/* Left — cinematic visual */}
        <section className="relative hidden lg:flex items-center justify-center overflow-hidden bg-primary">
          <div className="absolute inset-0 z-0">
            <div
              className="w-full h-full bg-cover bg-center opacity-60"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=1600&fit=crop&q=80')",
              }}
            />
          </div>
          <div className="relative z-10 p-16 max-w-lg text-center">
            <div className="flex items-center justify-center gap-3 text-on-primary mb-8">
              <span className="font-display text-4xl tracking-widest">VTryon</span>
            </div>
            <h1 className="font-display text-[56px] leading-[1.1] text-on-primary mb-6">
              Try before you buy
            </h1>
            <p className="text-on-primary/70 text-lg leading-relaxed">
              Upload your photo and virtually try on thousands of outfits with AI-powered precision.
              Nepal&apos;s first virtual fitting room designed for the discerning individual.
            </p>
          </div>
        </section>

        {/* Right — form */}
        <section className="flex items-center justify-center px-6 md:px-24 py-24 bg-surface-bright">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </div>
  );
}
