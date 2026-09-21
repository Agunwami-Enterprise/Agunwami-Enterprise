import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner With Agunwami | Technology Partnership",
  description:
    "Ready to build together? Apply to partner with Agunwami Enterprise for software development, digital platforms, and scalable technology solutions.",
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
