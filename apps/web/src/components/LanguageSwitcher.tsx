"use client";

import { useLocale } from "next-intl";

const LOCALES = [
  { code: "en", label: "EN", ariaLabel: "English" },
  { code: "ne", label: "ने", ariaLabel: "नेपाली" },
  { code: "hi", label: "हि", ariaLabel: "हिन्दी" },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();

  function switchLocale(newLocale: string) {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language selection">
      {LOCALES.map(({ code, label, ariaLabel }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`text-[11px] px-2 py-1 transition-colors ${
            locale === code
              ? "text-primary font-bold border-b border-primary"
              : "text-on-surface-variant hover:text-primary"
          }`}
          aria-current={locale === code ? "true" : undefined}
          aria-label={ariaLabel}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
