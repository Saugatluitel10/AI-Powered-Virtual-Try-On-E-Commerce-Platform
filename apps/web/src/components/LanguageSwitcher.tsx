"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "ne", label: "ने" },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language selection">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            locale === code
              ? "bg-purple-100 text-purple-700 font-semibold"
              : "text-gray-500 hover:text-gray-700"
          }`}
          aria-current={locale === code ? "true" : undefined}
          aria-label={code === "en" ? "English" : "नेपाली"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
