import type { Metadata } from "next";
import type { ReactNode } from "react";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solception — the launchpad that launches launchpads",
  description: "Spin up your own Solana token launchpad in one transaction. Earn on every trade.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="bg">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>
        <Providers>
          <Header />
          <main>
            <div className="container">{children}</div>
          </main>
          <footer className="footer">
            <div className="container">
              <span>
                <span className="grad-text">Solception</span> · launchpads all the way down
              </span>
              <span>Built on Solana</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
