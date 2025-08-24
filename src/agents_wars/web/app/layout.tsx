import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Space_Grotesk, DM_Sans } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-head" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-body" });

export const metadata = {
  title: "Agent Wars",
  description: "Agent Wars web app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} bg-slate-950 text-slate-100`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:rounded focus:bg-blue-700 focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Header />
        <div id="main" className="min-h-[calc(100dvh-140px)]">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
