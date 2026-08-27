import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Check, GraduationCap, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { explainSharedAnswer } from "@/lib/quiz.functions";
import { scoreBand } from "@/lib/quiz-types";
import type { QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/s/$token")({
  head: () => ({
    meta: [
      { title: "A quiz shared with you — Smart Quiz" },
      {
        name: "description",
        content: "Play an AI-generated quiz shared by a friend. No account needed — just answer and see your score.",
      },
      { property: "og:title", content: "A quiz shared with you — Smart Quiz" },
      {
        property: "og:description",
        content: "Play an AI-generated quiz shared by a friend. No sign-up required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharedQuizPage,
});

function GuestHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Smart Quiz</span>
        </Link>
        <Button asChild size="sm" variant="secondary">
          <Link to="/">Make your own</Link>
        </Button>
      </div>
    </header>
  );
}

function SharedQuizPage() {
  const { token } = Route.useParams();
  const explain = useServerFn(explainSharedAnswer);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["shared-quiz", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, questions, is_public")
        .eq("share_token", token)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const questions = (quiz?.questions as unknown as QuizQuestion[]) ?? [];

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [done, setDone] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <GuestHeader />
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <GuestHeader />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-xl font-semibold">This quiz isn't available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may have expired or sharing was turned off.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Build your own quiz</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (done) {
    const score = picks.filter((p, i) => p === questions[i]?.correctIndex).length;
    const percentage = Math.round((score / questions.length) * 100);
    const band = scoreBand(percentage);
    return (
      <div className="min-h-screen bg-background">
        <GuestHeader />
        <main className="mx-auto w-full max-w-2xl px-4 py-8">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex flex-col items-center py-8 text-center">
              <div
                className="flex size-32 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(var(--primary) ${percentage * 3.6}deg, var(--muted) 0deg)`,
                }}
              >
                <div className="flex size-24 flex-col items-center justify-center rounded-full bg-card">
                  <span className="font-display text-2xl font-bold tabular-nums">{percentage}%</span>
                  <span className="text-xs text-muted-foreground">
                    {score}/{questions.length}
                  </span>
                </div>
              </div>
              <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{band.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{band.note}</p>
              <p className="mt-3 text-sm font-medium">{quiz.title}</p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIndex(0);
                    setSelected(null);
                    setPicks([]);
                    setExplanation(null);
                    setDone(false);
                  }}
                >
                  <RotateCcw className="size-4" /> Retake quiz
                </Button>
                <Button asChild>
                  <Link to="/">
                    <Sparkles className="size-4" /> Make your own quiz
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <h2 className="mt-8 font-display text-lg font-semibold">Review</h2>
          <ul className="mt-3 space-y-3">
            {questions.map((question, i) => {
              const correct = picks[i] === question.correctIndex;
              return (
                <li key={i}>
                  <Card className="border-border/70">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                            correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                          )}
                        >
                          {correct ? <Check className="size-4" /> : <X className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{question.question}</p>
                          <p className="mt-2 text-sm text-success">
                            Correct: {question.options[question.correctIndex]}
                          </p>
                          {!correct && (
                            <p className="text-sm text-danger">
                              You answered: {question.options[picks[i] ?? -1] ?? "no answer"}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </main>
      </div>
    );
  }

  const current = questions[index]!;
  const answered = selected !== null;

  function choose(optionIndex: number) {
    if (answered) return;
    setSelected(optionIndex);
    setPicks((prev) => {
      const next = [...prev];
      next[index] = optionIndex;
      return next;
    });
  }

  async function requestExplanation() {
    if (selected === null || explaining) return;
    setExplaining(true);
    try {
      const result = await explain({
        data: { shareToken: token, questionIndex: index, selectedIndex: selected },
      });
      setExplanation(result.explanation);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not get an explanation.");
    } finally {
      setExplaining(false);
    }
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setExplanation(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <GuestHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <p className="text-xs font-medium text-muted-foreground">Shared quiz — no account needed</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Question {index + 1} of {questions.length}
          </p>
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
          <Button onClick={next} disabled={!answered} size="lg">
            {index + 1 >= questions.length ? "See results" : "Next question"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
