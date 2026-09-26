import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXO RADIO — Donde Todo Conecta | En Vivo",
  description: "Radio online en vivo. Más que música, somos conexión. Escucha las mejores transmisiones musicales con locutores en vivo.",
  icons: {
    icon: [
      { url: "/favicon_nexo.png", type: "image/png" },
    ],
    shortcut: "/favicon_nexo.png",
    apple: "/isotipo_nexo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark h-full">
      <head>
        <link rel="icon" href="/favicon_nexo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/isotipo_nexo.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#090a0d] text-[#f3f4f6] selection:bg-[#e5b45f] selection:text-black">
        {children}
      </body>
    </html>
  );
}
