import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Software Development Insights for Digital Growth",
  description:
    "Get practical insights on software development, digital platforms, UI/UX, APIs, and scalable digital infrastructure from Agunwami Enterprise.",
};

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
