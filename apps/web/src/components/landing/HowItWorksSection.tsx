import { Upload, Shirt, Sparkles, ShoppingCart } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "01",
    title: "Upload Your Photo",
    description: "Take a full-body photo or upload one from your gallery. Our AI handles the rest.",
  },
  {
    icon: Shirt,
    number: "02",
    title: "Pick Any Outfit",
    description: "Browse thousands of products from Nepali and international brands.",
  },
  {
    icon: Sparkles,
    number: "03",
    title: "See It On You",
    description: "Our AI generates a realistic try-on image showing exactly how the outfit fits your body.",
  },
  {
    icon: ShoppingCart,
    number: "04",
    title: "Shop with Confidence",
    description: "Get AI size recommendations and buy knowing it will fit — pay with eSewa, Khalti, or card.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 bg-surface">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
        <div className="text-center mb-16">
          <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-secondary mb-4">
            How It Works
          </div>
          <h2 className="font-display text-[36px] sm:text-[42px] text-primary leading-tight">
            From photo to purchase in four steps
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((s) => (
            <div key={s.number} className="text-center">
              <div className="font-display text-[48px] text-outline-variant/60 mb-4">{s.number}</div>
              <div className="w-12 h-12 bg-primary text-on-primary flex items-center justify-center mx-auto mb-5">
                <s.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-[18px] text-primary mb-2">{s.title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
