import type { Metadata } from "next";
import { Bodoni_Moda, Lato, Montserrat } from "next/font/google";
import "./globals.css";
import { StoreInitializer } from "@/components/providers/StoreInitializer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bodoni",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "allwondrous",
  description: "Professional fitness training platform",
  icons: {
    icon: "/images/w-icon-logo.ico",
    apple: "/images/w-icon-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body
        className={`${lato.variable} ${bodoniModa.variable} ${montserrat.variable} antialiased bg-gray-50 dark:bg-gray-900 font-sans overflow-x-hidden`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <StoreInitializer />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
