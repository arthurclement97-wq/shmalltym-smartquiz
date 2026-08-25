import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  sourceType: z.enum(["pdf", "image", "text"]),
  text: z.string().optional(),
  fileName: z.string().optional(),
  fileMime: z.string().optional(),
  fileData: z.string().optional(),
  questionCount: z.number().int().min(1).max(30),
  questionType: z.enum(["mcq", "truefalse"]),
});

const ExplainInput = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
  selectedIndex: z.number().int(),
  sourceHint: z.string().optional(),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const { generateQuizFromMaterial } = await import("./openai.server");
    return generateQuizFromMaterial({
      material: {
        sourceType: data.sourceType,
        text: data.text,
        fileName: data.fileName,
        fileMime: data.fileMime,
        fileData: data.fileData,
      },
      questionCount: data.questionCount,
      questionType: data.questionType,
    });
  });

const ImportInput = z.object({
  sourceType: z.enum(["pdf", "image", "text"]),
  text: z.string().optional(),
  fileName: z.string().optional(),
  fileMime: z.string().optional(),
  fileData: z.string().optional(),
  maxQuestions: z.number().int().min(1).max(50),
});

export const importQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImportInput.parse(input))
  .handler(async ({ data }) => {
    const { importQuizFromPaper } = await import("./openai.server");
    return importQuizFromPaper({
      material: {
        sourceType: data.sourceType,
        text: data.text,
        fileName: data.fileName,
        fileMime: data.fileMime,
        fileData: data.fileData,
      },
      maxQuestions: data.maxQuestions,
    });
  });

export const explainAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExplainInput.parse(input))
  .handler(async ({ data }) => {
    const { explainQuestion } = await import("./openai.server");
    const explanation = await explainQuestion({
      question: data.question,
      options: data.options,
      correctIndex: data.correctIndex,
      selectedIndex: data.selectedIndex,
      sourceHint: data.sourceHint,
    });
    return { explanation };
  });
