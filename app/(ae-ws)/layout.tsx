import { AuthProvider } from "@/lib/workstation/auth-context";

export default function WorkstationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
