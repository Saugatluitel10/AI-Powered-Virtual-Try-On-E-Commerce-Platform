import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const locales = ["en", "ne", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get("locale")?.value;
  const acceptLang = headerStore.get("accept-language")?.split(",")[0]?.split("-")[0];

  const locale: Locale =
    locales.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : locales.includes(acceptLang as Locale)
        ? (acceptLang as Locale)
        : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
