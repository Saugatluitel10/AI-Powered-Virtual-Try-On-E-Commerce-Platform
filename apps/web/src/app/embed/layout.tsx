import "../globals.css";

export const metadata = {
  title: "VTryon — Virtual Try-On Widget",
  robots: "noindex, nofollow",
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
