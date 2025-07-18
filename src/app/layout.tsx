
import type { Metadata } from "next";
import { PT_Sans } from "next/font/google"; // Changed from Inter to PT_Sans
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeInitializer } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const ptSans = PT_Sans({ // Initialize PT Sans
  subsets: ["latin"],
  weight: ["400", "700"] // Include weights you need
});

export const metadata: Metadata = {
  title: "MyBase App", // Corrected App Name if necessary
  description: "The ultimate taxi app solution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={ptSans.className}> {/* Apply PT Sans class */}
        <AuthProvider>
          <ThemeInitializer>
            <Toaster />
            {children}
          </ThemeInitializer>
        </AuthProvider>
        <script dangerouslySetInnerHTML={{
          __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/service-worker.js'); }); }`
        }} />
      </body>
    </html>
  );
}
