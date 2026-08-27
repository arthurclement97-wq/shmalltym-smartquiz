import { z } from "zod";

export const GenerateInput = z.object({
  sourceType: z.enum(["pdf", "image", "text"]),
  text: z.string().optional(),
  fileName: z.string().optional(),
  fileMime: z.string().optional(),
  fileData: z.string().optional(),
  questionCount: z.number().int().min(1).max(150),
  questionType: z.enum(["mcq", "truefalse"]),
});

export const ImportInput = z.object({
  sourceType: z.enum(["pdf", "image", "text"]),
  text: z.string().optional(),
  fileName: z.string().optional(),
  fileMime: z.string().optional(),
  fileData: z.string().optional(),
  maxQuestions: z.number().int().min(1).max(150),
});

export const ExplainInput = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
  selectedIndex: z.number().int(),
  sourceHint: z.string().optional(),
});

export const ExplainSharedInput = z.object({
  shareToken: z.string().uuid(),
  questionIndex: z.number().int().min(0),
  selectedIndex: z.number().int(),
});
