import type { Metadata } from "next";
import { DM_Serif_Display, Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/common/ThemeProvider";
import { AuthProvider } from "@/lib/workstation/auth-context";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Custom Software Development Company | Agunwami Enterprise",
  description:
    "Need digital infrastructure? Agunwami Enterprise builds custom software, digital platforms, and web solutions for organizations and technology teams.",
  keywords: [
    "software development company",
    "custom software development company",
    "web development company",
    "digital infrastructure",
    "enterprise software development",
    "business automation solutions",
  ],
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking script — executes before first paint to prevent theme flash.
            Handles both public site 'theme' key and workstation 'ae-theme' key.
            Placed in <head> so React 19 hoists it without triggering the script-in-body warning. */}
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme')||localStorage.getItem('ae-theme');var d=document.documentElement;if(s==='dark'){d.classList.add('dark');d.classList.remove('light')}else if(s==='light'){d.classList.remove('dark');d.classList.add('light')}else{d.classList.remove('light');if(window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark')}else{d.classList.remove('dark')}}}catch(e){}})();
            (function(){if(typeof window!=='undefined'&&'serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){for(var r of regs){r.unregister();}});}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
