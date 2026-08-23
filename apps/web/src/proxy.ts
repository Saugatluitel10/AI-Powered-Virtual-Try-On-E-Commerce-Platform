import { NextResponse, type NextRequest } from "next/server";

const LEGACY_ROUTES: Array<[RegExp, string]> = [
  [/^\/(admin|dashboard|brand|developers)(\/|$)/, "/"],
  [/^\/(analysis|embed\/tryon|try-on\/history|upload)(\/|$)/, "/stylist"],
  [/^\/(wardrobe|wishlist)(\/|$)/, "/shop"],
  [/^\/(notifications|onboarding|profile|settings)(\/|$)/, "/"],
  [/^\/orders\/[^/]+$/, "/orders"],
  [/^\/(auth\/callback|verify-email)(\/|$)/, "/login"],
  [/^\/checkout\/(esewa|khalti|stripe)(\/|$)/, "/checkout"],
];

export function proxy(request: NextRequest) {
  const legacy = LEGACY_ROUTES.find(([pattern]) => pattern.test(request.nextUrl.pathname));
  if (legacy) return NextResponse.redirect(new URL(legacy[1], request.url));

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/|products/).*)"],
};
