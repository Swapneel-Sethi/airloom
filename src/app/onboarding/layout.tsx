import type { ReactNode } from "react";
import { ProfileProvider } from "@/components/providers";

export const metadata = {
  title: "Set up your plan",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
