"use client";
import Image from "next/image";
import Buttons from "./ui/Buttons";
import { usePathname } from "next/navigation";

export default function Header() {
  const navLinks = [
    {
      id: 1,
      title: "Home",
      href: "/",
    },
    {
      id: 2,
      title: "About",
      href: "/about",
    },
    {
      id: 3,
      title: "Services",
      href: "/services",
    },
    {
      id: 4,
      title: "Projects",
      href: "/projects",
    },
    {
      id: 5,
      title: "Ecosystem",
      href: "#",
    },
    {
      id: 6,
      title: "Partnerships",
      href: "#",
    },
  ];
  const pathname = usePathname();
  return (
    <header className="mt-4 z-50 rounded-full bg-white fixed top-0 w-[95%] border-b border-gray-200 shadow-md backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl flex items-center justify-center">
            <Image src="/logo.png" width={50} height={50} alt="logo" />
          </div>
          <h1 className="text-2xl font-primary font-[400] tracking-tight text-gray-900 dark:text-white">
            Agunwami Enterprise
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={`text-sm font-medium flex items-center h-10 ${
                pathname === link.href ? "border-b-2 border-b-primary" : ""
              }`}
            >
              {link.title}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Buttons lg primaryButton>
            Partner With Us
          </Buttons>
        </div>
      </div>
    </header>
  );
}
