import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  ScanLine,
  Sparkles,
  Timer,
  Type as TypeIcon,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateQuiz, importQuiz } from "@/lib/quiz.functions";
import type { QuestionType, SourceType } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Quiz — AI quizzes from your study material" },
      {
        name: "description",
        content:
          "Upload a PDF, image or paste your notes and Smart Quiz builds an AI quiz from them. Instant feedback, AI explanations and scores.",
      },
      { property: "og:title", content: "Smart Quiz — AI quizzes from your study material" },
      {
        property: "og:description",
        content: "Upload a PDF, image or paste your notes and get an instant AI-generated quiz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const MAX_BYTES = 8 * 1024 * 1024;
const TIMER_OPTIONS = [
  { label: "No timer", value: 0 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
  { label: "20 min", value: 1200 },
];

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const generate = useServerFn(generateQuiz);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<SourceType>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [count, setCount] = useState(10);
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function pickFile(picked: File | undefined) {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      toast.error("That file is larger than 8 MB. Try a smaller one.");
      return;
    }
    const isPdf = picked.type === "application/pdf";
    if (mode === "pdf" && !isPdf) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (mode === "image" && !picked.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setFile(picked);
  }

  async function handleGenerate() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (mode === "text" && text.trim().length < 40) {
      toast.error("Paste a bit more study material (at least a short paragraph).");
      return;
    }
    if (mode !== "text" && !file) {
      toast.error(`Please upload ${mode === "pdf" ? "a PDF" : "an image"} first.`);
      return;
    }

    setBusy(true);
    try {
      const payload =
        mode === "text"
          ? { sourceType: "text" as const, text }
          : {
              sourceType: mode,
              fileName: file!.name,
              fileMime: file!.type,
              fileData: await toBase64(file!),
            };

      const quiz = await generate({
        data: { ...payload, questionCount: count, questionType },
      });

      const { data: inserted, error } = await supabase
        .from("quizzes")
        .insert({
          user_id: user.id,
          title: quiz.title,
          source_type: mode,
          question_type: questionType,
          question_count: quiz.questions.length,
          timer_seconds: timer > 0 ? timer : null,
          questions: quiz.questions as unknown as never,
        })
        .select("id")
        .single();

      if (error || !inserted) throw new Error("Could not save your quiz. Please try again.");
      navigate({ to: "/quiz/$id", params: { id: inserted.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong generating the quiz.");
    } finally {
      setBusy(false);
    }
  }

  const modes: { key: SourceType; label: string; icon: typeof FileText }[] = [
    { key: "pdf", label: "PDF", icon: FileText },
    { key: "image", label: "Image", icon: ImageIcon },
    { key: "text", label: "Paste text", icon: TypeIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <section className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <Sparkles className="size-3.5" /> AI quiz generator
          </span>
          <h1 className="mt-4 font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            Turn your study material into a quiz
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            Upload a PDF or a photo of your notes, or paste text. Smart Quiz asks questions strictly from
            your own material.
          </p>
        </section>

        <Card className="mt-8 border-border/70 shadow-sm">
          <CardContent className="space-y-7 py-6">
            <div>
              <Label className="text-sm">Study material</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {modes.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMode(key);
                      setFile(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors",
                      mode === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>

              {mode === "text" ? (
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your notes, a chapter summary, or lecture text…"
                  className="mt-3 min-h-40"
                />
              ) : file ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-3">
                  <span className="truncate text-sm font-medium">{file.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file">
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pickFile(e.dataTransfer.files[0]);
                  }}
                  className={cn(
                    "mt-3 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-sm transition-colors",
                    dragging ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/60",
                  )}
                >
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="font-medium">
                    Drop your {mode === "pdf" ? "PDF" : "image"} here or tap to browse
                  </span>
                  <span className="text-xs text-muted-foreground">Up to 8 MB</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={mode === "pdf" ? "application/pdf" : "image/*"}
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Number of questions</Label>
                <span className="text-sm font-semibold tabular-nums text-primary">{count}</span>
              </div>
              <Slider
                className="mt-3"
                min={5}
                max={20}
                step={1}
                value={[count]}
                onValueChange={(v) => setCount(v[0] ?? 10)}
              />
            </div>

            <div>
              <Label className="text-sm">Question type</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "mcq" as QuestionType, label: "Multiple choice" },
                    { key: "truefalse" as QuestionType, label: "True / False" },
                  ]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQuestionType(key)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      questionType === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5 text-sm">
                <Timer className="size-4" /> Timer (optional)
              </Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {TIMER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTimer(option.value)}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                      timer === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleGenerate} disabled={busy || loading}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy ? "Generating your quiz…" : "Generate quiz"}
            </Button>

            {!user && !loading && (
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>{" "}
                to generate and save quizzes.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
