import { Camera, Sparkles, Ruler, ShoppingBag, BarChart3, Globe } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Virtual Try-On",
    description:
      "Upload your photo and see exactly how clothes look on your body — powered by state-of-the-art AI.",
  },
  {
    icon: Sparkles,
    title: "AI Style Advisor",
    description:
      "Get personalized outfit recommendations from our AI stylist who understands your body type and preferences.",
  },
  {
    icon: Ruler,
    title: "Smart Measurements",
    description:
      "Our AI estimates your body measurements from your photo to suggest the perfect size every time.",
  },
  {
    icon: ShoppingBag,
    title: "Confident Shopping",
    description:
      "No more size uncertainty. See it, try it, buy it — with the confidence that it will fit perfectly.",
  },
  {
    icon: BarChart3,
    title: "For Retailers",
    description:
      "Reduce return rates significantly. Our SaaS platform integrates with any e-commerce store in minutes.",
  },
  {
    icon: Globe,
    title: "Made for Nepal",
    description:
      "Built specifically for Nepali fashion brands and body types, with eSewa and Khalti payment support.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-surface-bright">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
        <div className="text-center mb-16">
          <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-secondary mb-4">
            The Platform
          </div>
          <h2 className="font-display text-[36px] sm:text-[42px] text-primary leading-tight mb-4">
            Everything you need to shop with confidence
          </h2>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            VTryon combines cutting-edge AI with a seamless shopping experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-outline-variant/40">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-surface-bright p-10 hover:bg-surface-container-low transition-colors group"
            >
              <feature.icon className="w-6 h-6 text-secondary mb-6 group-hover:text-primary transition-colors" />
              <h3 className="font-display text-[20px] text-primary mb-3">{feature.title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
