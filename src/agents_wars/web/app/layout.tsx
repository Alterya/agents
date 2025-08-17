import "./globals.css";

export const metadata = {
  title: "Agent Wars",
  description: "Agent Wars web app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
