import Footer from "../components/Footer";
import Header from "../components/common/Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between items-center min-h-screen w-full">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
