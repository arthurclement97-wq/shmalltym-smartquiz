import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ExplainInput, ExplainSharedInput, GenerateInput, ImportInput } from "./quiz-schemas";


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
