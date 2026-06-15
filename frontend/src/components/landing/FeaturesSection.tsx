import { Camera, Sparkles, Ruler, ShoppingBag, BarChart3, Globe } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Virtual Try-On",
    description:
      "Upload your photo and see exactly how clothes look on your body — powered by state-of-the-art AI.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Sparkles,
    title: "AI Style Advisor",
    description:
      "Get personalized outfit recommendations from our Claude-powered stylist who knows your body type and preferences.",
    color: "bg-pink-100 text-pink-600",
  },
  {
    icon: Ruler,
    title: "Smart Measurements",
    description:
      "Our AI estimates your body measurements from your photo to suggest the perfect size every time.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: ShoppingBag,
    title: "Confident Shopping",
    description:
      "No more size uncertainty. See it, try it, buy it — with the confidence that it will fit perfectly.",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: BarChart3,
    title: "For Retailers",
    description:
      "Reduce return rates by 60%. Our SaaS platform integrates with any e-commerce store in minutes.",
    color: "bg-orange-100 text-orange-600",
  },
  {
    icon: Globe,
    title: "Made for Nepal",
    description:
      "Built specifically for Nepali fashion brands and body types, with local payment support.",
    color: "bg-teal-100 text-teal-600",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything you need to shop with confidence
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            VTryon combines cutting-edge AI with a seamless shopping experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
