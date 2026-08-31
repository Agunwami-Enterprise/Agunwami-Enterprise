import Script from "next/script";
import Footer from "../components/Footer";
import Header from "../components/common/Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between items-center min-h-screen w-full">
      {/* Google tag (gtag.js) */}
      <Script
        id="gtag-js"
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-Q39DQ9CSR8"
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Q39DQ9CSR8');
          `,
        }}
      />
      <Header />
      {children}
      <Footer />
    </div>
  );
}
