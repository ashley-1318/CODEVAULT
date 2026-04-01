import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VAULT — COBOL Modernization Platform",
  description:
    "Value-Aware Unified Legacy Transformation. AI-powered COBOL analysis, regulatory compliance mapping, and dependency graphing for BFSI systems.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center shadow-lg shadow-vault-500/30 group-hover:shadow-vault-500/50 transition-shadow">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <div>
                <span className="font-bold text-white text-lg tracking-tight">VAULT</span>
                <span className="text-vault-400 text-xs ml-2 font-medium hidden sm:inline">
                  COBOL Modernization
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <NavLink href="/upload">Upload</NavLink>
              <NavLink href="/registry">Registry</NavLink>
              <NavLink href="/compliance-map/LOAN-CALC">Compliance</NavLink>
            </div>
          </div>
        </nav>

        {/* Page content with top padding for nav */}
        <main className="pt-16 min-h-screen">{children}</main>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
    >
      {children}
    </Link>
  );
}
