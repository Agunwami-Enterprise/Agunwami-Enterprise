import Footer from "../components/Footer";
import CTA from "../components/common/CTA";
import Header from "../components/common/Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center min-h-screen w-full">
      <Header />
      {children}
      <CTA />
      <Footer />
    </div>
  );
}
