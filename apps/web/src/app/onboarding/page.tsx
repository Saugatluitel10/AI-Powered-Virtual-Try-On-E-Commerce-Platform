"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { trackEvent } from "@/lib/posthog";

const STEPS = [
  {
    title: "What's your style?",
    description: "Pick the styles that resonate with you",
    key: "preferredStyles" as const,
    options: [
      { value: "casual", label: "Casual", emoji: "👕", desc: "Relaxed, everyday looks" },
      { value: "formal", label: "Formal", emoji: "👔", desc: "Polished, professional outfits" },
      { value: "streetwear", label: "Streetwear", emoji: "🧢", desc: "Urban, trendy fashion" },
      { value: "traditional", label: "Traditional", emoji: "🪷", desc: "Nepali & South Asian wear" },
      { value: "sporty", label: "Sporty", emoji: "🏃", desc: "Athletic, activewear looks" },
    ],
  },
  {
    title: "What do you shop for?",
    description: "Select the occasions you dress for most",
    key: "occasions" as const,
    options: [
      { value: "work", label: "Work", emoji: "💼", desc: "Office & business meetings" },
      { value: "everyday", label: "Everyday", emoji: "☀️", desc: "Daily wear & errands" },
      { value: "festivals", label: "Festivals", emoji: "🎊", desc: "Dashain, Tihar & celebrations" },
      { value: "weddings", label: "Weddings", emoji: "💒", desc: "Ceremonies & receptions" },
      { value: "gym", label: "Gym", emoji: "💪", desc: "Workouts & sports" },
    ],
  },
  {
    title: "Pick your colors",
    description: "Choose the color palettes you love",
    key: "colorPalette" as const,
    options: [
      { value: "neutrals", label: "Neutrals", emoji: "🤎", desc: "Black, white, beige, grey" },
      { value: "brights", label: "Brights", emoji: "🌈", desc: "Bold reds, blues, greens" },
      { value: "pastels", label: "Pastels", emoji: "🌸", desc: "Soft pinks, lavenders, mints" },
      { value: "darks", label: "Darks", emoji: "🖤", desc: "Deep navy, burgundy, forest" },
    ],
  },
];

type Selections = {
  preferredStyles: string[];
  occasions: string[];
  colorPalette: string[];
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Selections>({
    preferredStyles: [],
    occasions: [],
    colorPalette: [],
  });
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[step];

  function toggleOption(value: string) {
    const key = currentStep.key;
    setSelections((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await api.put("/users/me/style-profile", selections);
      trackEvent("style_quiz_completed", selections);
      router.push("/shop");
    } catch {
      setSaving(false);
    }
  }

  const canProceed = selections[currentStep.key].length > 0;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i <= step ? "bg-purple-600 w-12" : "bg-gray-200 w-8"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            Step {step + 1} of {STEPS.length}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {currentStep.title}
          </h1>
          <p className="text-gray-500">{currentStep.description}</p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {currentStep.options.map((option) => {
            const selected = selections[currentStep.key].includes(option.value);
            return (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selected
                    ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                    : "border-gray-200 hover:border-purple-300"
                }`}
                onClick={() => toggleOption(option.value)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="text-3xl">{option.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.desc}</p>
                  </div>
                  {selected && (
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleFinish}
              disabled={!canProceed || saving}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {saving ? "Saving..." : "Finish & Start Shopping"}
              <Sparkles className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Skip */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/shop")}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
