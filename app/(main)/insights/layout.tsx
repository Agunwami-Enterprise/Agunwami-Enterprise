import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Software Development Insights for Digital Growth | AE",
  description:
    "Get practical insights on software development, digital platforms, UI/UX, APIs, and scalable digital infrastructure from Agunwami Enterprise.",
  alternates: {
    canonical: "/insights",
  },
  openGraph: {
    title: "Software Development Insights for Digital Growth | AE",
    description:
      "Get practical insights on software development, digital platforms, UI/UX, APIs, and scalable digital infrastructure from Agunwami Enterprise.",
    url: "https://agunwamienterprise.com/insights",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Software Development Insights for Digital Growth | AE",
    description:
      "Get practical insights on software development, digital platforms, UI/UX, APIs, and scalable digital infrastructure from Agunwami Enterprise.",
  },
};

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
