import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ThemeProvider from "./components/common/ThemeProvider";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agunwami Enterprise",
  description: "Next Generation Solutions",
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
      className={`${dmSerifDisplay.variable} ${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/*
          Blocking script — executes before first paint to prevent theme flash.
          strategy="beforeInteractive" ensures it runs before any JS hydration.
        */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var d=document.documentElement;if(s==='dark'){d.classList.add('dark');d.classList.remove('light')}else if(s==='light'){d.classList.remove('dark');d.classList.add('light')}else{d.classList.remove('light');if(window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark')}else{d.classList.remove('dark')}}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
