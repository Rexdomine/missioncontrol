import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mission Control",
    template: "%s | Mission Control",
  },
  description: "Visual operations dashboard for StarLord and Rex.",
  applicationName: "Mission Control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
