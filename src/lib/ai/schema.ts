import { z } from "zod";

export const copilotAnswerSchema = z.object({
  recommendation: z.string().min(1).max(600),
  why: z.array(z.string().min(1).max(320)).min(1).max(4),
  whatToDo: z.array(z.string().min(1).max(260)).min(1).max(4),
  alternative: z.string().min(1).max(420),
  dataUsed: z.array(z.string().min(1).max(160)).max(6).default([]),
  safetyNote: z.string().max(420).nullable(),
});

export type ValidatedCopilotAnswer = z.infer<typeof copilotAnswerSchema>;

export const geminiResponseSchema = {
  type: "OBJECT",
  properties: {
    recommendation: { type: "STRING" },
    why: { type: "ARRAY", items: { type: "STRING" } },
    whatToDo: { type: "ARRAY", items: { type: "STRING" } },
    alternative: { type: "STRING" },
    dataUsed: { type: "ARRAY", items: { type: "STRING" } },
    safetyNote: { type: "STRING", nullable: true },
  },
  required: [
    "recommendation",
    "why",
    "whatToDo",
    "alternative",
    "dataUsed",
    "safetyNote",
  ],
  propertyOrdering: [
    "recommendation",
    "why",
    "whatToDo",
    "alternative",
    "dataUsed",
    "safetyNote",
  ],
};
