import type { ReactNode } from "react";
import { ProfileProvider, EnvironmentProvider } from "@/components/providers";
import { DashboardShell } from "@/components/dashboard/shell";

export const metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <EnvironmentProvider>
        <DashboardShell>{children}</DashboardShell>
      </EnvironmentProvider>
    </ProfileProvider>
  );
}
