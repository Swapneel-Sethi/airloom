"use client";

import { useMemo } from "react";
import { buildIndoorOutlook } from "@/lib/indoor";
import { buildPlan } from "@/lib/plan";
import { compareCommute } from "@/lib/commute";
import { useEnvironment, useProfile } from "@/components/providers";

export function useDerived() {
  const { profile } = useProfile();
  const { environment } = useEnvironment();

  return useMemo(() => {
    if (!environment) return null;
    const plan = buildPlan(environment, profile);
    const indoor = buildIndoorOutlook(environment, profile);
    const commute = compareCommute(
      environment,
      profile,
      Number(profile.commuteTime.slice(0, 2)),
    );
    return { plan, indoor, commute };
  }, [environment, profile]);
}
