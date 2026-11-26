import type { ReactNode } from "react";
import { ProfileProvider } from "@/components/providers";

export const metadata = {
  title: "Choose a profile",
  robots: { index: false, follow: false },
};

export default function ProfilesLayout({ children }: { children: ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
