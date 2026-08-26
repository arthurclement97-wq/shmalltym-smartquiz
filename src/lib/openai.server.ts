import type { QuestionType, QuizQuestion } from "./quiz-types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";

export interface MaterialInput {
  sourceType: "pdf" | "image" | "text";
  text?: string | undefined;
  fileName?: string | undefined;
  fileMime?: string | undefined;
  fileData?: string | undefined; // raw base64 (no data: prefix)
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

function materialBlocks(material: MaterialInput): ContentBlock[] {
  if (material.sourceType === "text") {
    const text = (material.text ?? "").trim();
    if (!text) throw new Error("No study material was provided.");
    return [{ type: "text", text: `STUDY MATERIAL:\n\n${text.slice(0, 60000)}` }];
  }

  if (!material.fileData) throw new Error("The uploaded file could not be read.");
  const mime = material.fileMime || (material.sourceType === "pdf" ? "application/pdf" : "image/png");
  const dataUrl = `data:${mime};base64,${material.fileData}`;

  if (material.sourceType === "image") {
    return [
      { type: "text", text: "STUDY MATERIAL is in the attached image." },
      { type: "image_url", image_url: { url: dataUrl } },
    ];
  }

  return [
    { type: "text", text: "STUDY MATERIAL is in the attached document." },
    { type: "file", file: { filename: material.fileName || "material.pdf", file_data: dataUrl } },
  ];
}

async function callOpenAI(body: Record<string, unknown>) {
  const apiKey = process.env["OPENAI_API_KEY"];
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey && !lovableApiKey) throw new Error("The AI service is not configured yet.");

  let res = await fetch(apiKey ? OPENAI_URL : LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey
        ? { Authorization: `Bearer ${apiKey}` }
        : { "Lovable-API-Key": String(lovableApiKey) }),
    },
    body: JSON.stringify({ model: apiKey ? MODEL : FALLBACK_MODEL, ...body }),
  });

  if (apiKey && lovableApiKey && (res.status === 429 || res.status >= 500)) {
    console.warn("OpenAI unavailable; using the managed AI fallback", res.status);
    res = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableApiKey,
      },
      body: JSON.stringify({ model: FALLBACK_MODEL, ...body }),
    });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Quiz AI error", res.status, detail);
    if (res.status === 401) throw new Error("The AI service is not configured correctly.");
    if (res.status === 402 || res.status === 403)
      throw new Error("AI generation is unavailable until the app's AI credits are topped up.");
    if (res.status === 429) throw new Error("The AI service is busy. Please wait a moment and try again.");
    if (res.status === 400)
      throw new Error("The AI could not read this material. Try a clearer file or paste the text.");
    throw new Error("The AI service is temporarily unavailable. Please try again.");
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export async function generateQuizFromMaterial(params: {
  material: MaterialInput;
  questionCount: number;
  questionType: QuestionType;
}): Promise<{ title: string; questions: QuizQuestion[] }> {
  const { material, questionCount, questionType } = params;
  const shape =
    questionType === "mcq"
      ? "Each question must have exactly 4 distinct answer options."
      : 'Each question must have exactly 2 options: ["True", "False"].';

  const content = await callOpenAI({
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Smart Quiz, an exam-setter for students. Build quizzes STRICTLY from the study material provided. " +
          "Never invent facts that are not supported by the material. If the material is too short, produce fewer questions. " +
          'Reply with JSON only, shaped as {"title": string, "questions": [{"question": string, "options": string[], "correctIndex": number, "sourceHint": string}]}. ' +
          "sourceHint is a short quote or paraphrase from the material that proves the answer.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Create ${questionCount} ${questionType === "mcq" ? "multiple choice" : "true/false"} questions. ${shape} Give the quiz a short descriptive title based on the material.`,
          },
          ...materialBlocks(material),
        ],
      },
    ],
  });

  let parsed: { title?: string; questions?: QuizQuestion[] };
  try {
    parsed = JSON.parse(content) as { title?: string; questions?: QuizQuestion[] };
  } catch {
    throw new Error("The AI returned an unreadable quiz. Please try again.");
  }

  const questions = (parsed.questions ?? [])
    .filter((q) => q && typeof q.question === "string" && Array.isArray(q.options))
    .map((q) => ({
      question: q.question,
      options: q.options.map((o) => String(o)),
      correctIndex:
        Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length
          ? q.correctIndex
          : 0,
      sourceHint: typeof q.sourceHint === "string" ? q.sourceHint : undefined,
    }))
    .slice(0, questionCount);

  if (questions.length === 0)
    throw new Error("No questions could be generated from this material. Try richer content.");

  return { title: parsed.title?.trim() || "Study Quiz", questions };
}

export async function importQuizFromPaper(params: {
  material: MaterialInput;
  maxQuestions: number;
}): Promise<{ title: string; questions: QuizQuestion[] }> {
  const { material, maxQuestions } = params;

  const content = await callOpenAI({
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Smart Quiz's paper importer. The supplied material is a HARD COPY question paper (scan, photo, PDF or typed text). " +
          "Transcribe the existing questions EXACTLY as written — do not invent new questions and do not reword them. " +
          "Keep every answer option in its original order and wording (strip leading labels like 'A.' or '1)'). " +
          "If the paper includes an answer key, marked answers, or a stated solution, use it for correctIndex. " +
          "If no answer is indicated, work out the correct option yourself and say so in sourceHint. " +
          "Skip essay or open-ended questions that have no options, and skip True/False questions' missing options by using [\"True\",\"False\"]. " +
          'Reply with JSON only, shaped as {"title": string, "questions": [{"question": string, "options": string[], "correctIndex": number, "sourceHint": string}]}. ' +
          "sourceHint is a short note on where the answer came from (answer key, marked script, or your reasoning).",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Transcribe up to ${maxQuestions} questions from this question paper into quiz format. Title the quiz using the paper's own heading if there is one.`,
          },
          ...materialBlocks(material),
        ],
      },
    ],
  });

  let parsed: { title?: string; questions?: QuizQuestion[] };
  try {
    parsed = JSON.parse(content) as { title?: string; questions?: QuizQuestion[] };
  } catch {
    throw new Error("The AI returned an unreadable quiz. Please try again.");
  }

  const questions = (parsed.questions ?? [])
    .filter(
      (q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length >= 2,
    )
    .map((q) => ({
      question: q.question,
      options: q.options.map((o) => String(o)),
      correctIndex:
        Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length
          ? q.correctIndex
          : 0,
      sourceHint: typeof q.sourceHint === "string" ? q.sourceHint : undefined,
    }))
    .slice(0, maxQuestions);

  if (questions.length === 0)
    throw new Error(
      "No questions could be read from this paper. Try a clearer scan, or paste the questions as text.",
    );

  return { title: parsed.title?.trim() || "Imported Question Paper", questions };
}

export async function explainQuestion(params: {
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number;
  sourceHint?: string | undefined;
}): Promise<string> {
  const content = await callOpenAI({
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a friendly tutor. Explain in 2-4 short sentences why the correct answer is right and, if the student chose differently, why their choice is wrong. Base the explanation on the supplied material context. No markdown headings.",
      },
      {
        role: "user",
        content: `Question: ${params.question}
Options: ${params.options.map((o, i) => `${i + 1}. ${o}`).join(" | ")}
Correct answer: ${params.options[params.correctIndex]}
Student answered: ${params.options[params.selectedIndex] ?? "no answer"}
Material context: ${params.sourceHint ?? "n/a"}`,
      },
    ],
  });

  return content.trim() || "No explanation available right now.";
}
