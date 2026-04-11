import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Otomotiv Sektörü Ücretlendirme Simülasyonu",
  description:
    "İK dersi için interaktif ücretlendirme simülasyonu - Aday profili oluştur, değerlendir, analiz et.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-steel-950 text-steel-100 antialiased">
        {/* Top metallic bar */}
        <div className="h-1 bg-gradient-to-r from-automotive-orange via-automotive-indigo to-automotive-green" />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-steel-800 py-4 text-center text-xs text-steel-600">
          Otomotiv Sektörü Ücretlendirme Simülasyonu &copy; 2026 &mdash; İK
          Ders Uygulaması
        </footer>
      </body>
    </html>
  );
}
