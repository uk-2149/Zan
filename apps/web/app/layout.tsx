import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { AuthProvider } from "@/components/shared/auth-provider";
import { WalletProvider } from "@/components/shared/wallet-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Zan | Decentralized GPU Compute",
  description: "Access elite global GPU power for your AI pipelines on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html
      lang="en"
      className="dark scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={`
          ${geistSans.variable} ${geistMono.variable} 
          antialiased font-sans 
          bg-brand-dark text-white min-h-screen flex flex-col
        `}
      >
        <AuthProvider>
          <WalletProvider>
            <Navbar />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
