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

/** Explanations for a publicly shared quiz — no account required. */
export const explainSharedAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExplainSharedInput.parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: quiz } = await supabasePublic
      .from("quizzes")
      .select("questions")
      .eq("share_token", data.shareToken)
      .eq("is_public", true)
      .maybeSingle();

    const questions = (quiz?.questions ?? []) as {
      question: string;
      options: string[];
      correctIndex: number;
      sourceHint?: string;
    }[];
    const question = questions[data.questionIndex];
    if (!question) throw new Error("This shared quiz is no longer available.");

    const { explainQuestion } = await import("./openai.server");
    const explanation = await explainQuestion({
      question: question.question,
      options: question.options,
      correctIndex: question.correctIndex,
      selectedIndex: data.selectedIndex,
      sourceHint: question.sourceHint,
    });
    return { explanation };
  });
