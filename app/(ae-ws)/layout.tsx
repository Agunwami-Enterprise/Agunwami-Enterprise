import { AuthProvider } from "@/lib/workstation/auth-context";
import { ConfirmProvider } from "@/app/components/common/AeModal";

export default function WorkstationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </AuthProvider>
  );
}
