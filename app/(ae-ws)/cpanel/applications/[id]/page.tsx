import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationDetailView } from "@/app/components/cpanel/ApplicationDetailView";
import { getApplication } from "@/backend/modules/site-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const application = await getApplication(id);
  if (!application) {
    return { title: "Application Not Found | C-Panel" };
  }
  const name =
    `${application.firstName} ${application.lastName}`.trim() ||
    application.email;
  return {
    title: `${name} - Application | C-Panel`,
  };
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const application = await getApplication(id);
  if (!application) notFound();

  return <ApplicationDetailView initialApplication={application} />;
}
