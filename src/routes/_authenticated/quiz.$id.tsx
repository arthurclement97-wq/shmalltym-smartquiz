import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { explainAnswer } from "@/lib/quiz.functions";
import type { AttemptAnswer, QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quiz/$id")({
  head: () => ({
    meta: [
      { title: "Take your quiz — Smart Quiz" },
      { name: "description", content: "Answer one question at a time and get instant AI feedback." },
      { property: "og:title", content: "Take your quiz — Smart Quiz" },
      { property: "og:description", content: "Answer one question at a time and get instant AI feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizPlayer,
});

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function QuizPlayer() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const explain = useServerFn(explainAnswer);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const questions = useMemo(() => (quiz?.questions as unknown as QuizQuestion[]) ?? [], [quiz]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (quiz?.timer_seconds) setRemaining(quiz.timer_seconds);
  }, [quiz?.timer_seconds]);

  const current = questions[index];

  async function finish(finalAnswers: AttemptAnswer[]) {
    if (submitting) return;
    setSubmitting(true);
    const score = finalAnswers.filter((a) => a.correct).length;
    const total = questions.length;
    const percentage = total ? Math.round((score / total) * 10000) / 100 : 0;
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: id,
        user_id: userData.user!.id,
        answers: finalAnswers as unknown as never,
        score,
        total,
        percentage,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("Could not save your results. Please try again.");
      return;
    }
    navigate({ to: "/results/$id", params: { id: data.id } });
  }

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      void finish(answers);
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!quiz || !current) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-xl font-semibold">Quiz not found</h1>
          <Button asChild className="mt-4">
            <Link to="/">Build a new quiz</Link>
          </Button>
        </main>
      </div>
    );
  }

  const answered = selected !== null;

  function choose(optionIndex: number) {
    if (answered) return;
    setSelected(optionIndex);
    setAnswers((prev) => [
      ...prev,
      {
        questionIndex: index,
        selectedIndex: optionIndex,
        correct: optionIndex === current!.correctIndex,
      },
    ]);
  }

  async function requestExplanation() {
    if (selected === null || explaining) return;
    setExplaining(true);
    try {
      const result = await explain({
        data: {
          question: current!.question,
          options: current!.options,
          correctIndex: current!.correctIndex,
          selectedIndex: selected,
          ...(current!.sourceHint ? { sourceHint: current!.sourceHint } : {}),
        },
      });
      setExplanation(result.explanation);
      setAnswers((prev) =>
        prev.map((a) =>
          a.questionIndex === index ? { ...a, explanation: result.explanation } : a,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not get an explanation.");
    } finally {
      setExplaining(false);
    }
  }

  function next() {
    if (index + 1 >= questions.length) {
      void finish(answers);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setExplanation(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Question {index + 1} of {questions.length}
          </p>
          {remaining !== null && (
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium tabular-nums",
                remaining <= 30 && "bg-danger-soft text-danger",
              )}
            >
              <Timer className="size-4" /> {formatTime(remaining)}
            </span>
          )}
        </div>
        <Progress value={((index + (answered ? 1 : 0)) / questions.length) * 100} className="mt-3" />

        <Card className="mt-6 border-border/70 shadow-sm">
          <CardContent className="py-6">
            <h1 className="font-display text-xl leading-snug font-semibold">{current.question}</h1>

            <div className="mt-5 space-y-3">
              {current.options.map((option, i) => {
                const isCorrect = i === current.correctIndex;
                const isPicked = i === selected;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => choose(i)}
                    disabled={answered}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors",
                      "border-border bg-card hover:bg-secondary disabled:cursor-default",
                      answered && isCorrect && "border-success bg-success-soft text-success",
                      answered && isPicked && !isCorrect && "border-danger bg-danger-soft text-danger",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-current/25 text-xs font-semibold">
                      {answered && isCorrect ? (
                        <Check className="size-4" />
                      ) : answered && isPicked ? (
                        <X className="size-4" />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>
                    <span className="font-medium">{option}</span>
                  </button>
                );
              })}
            </div>

            {answered && selected !== current.correctIndex && (
              <p className="mt-4 rounded-lg bg-success-soft px-4 py-3 text-sm font-medium text-success">
                Correct answer: {current.options[current.correctIndex]}
              </p>
            )}

            {answered && (
              <div className="mt-4 space-y-3">
                <Button variant="secondary" size="sm" onClick={requestExplanation} disabled={explaining}>
                  {explaining ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Explain Answer
                </Button>
                {explanation && (
                  <p className="rounded-lg border border-border/70 bg-muted px-4 py-3 text-sm leading-relaxed">
                    {explanation}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button onClick={next} disabled={!answered || submitting} size="lg">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {index + 1 >= questions.length ? "See results" : "Next question"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
