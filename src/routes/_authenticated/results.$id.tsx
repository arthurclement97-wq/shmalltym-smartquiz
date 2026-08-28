import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ShareQuizButton } from "@/components/ShareQuizButton";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { scoreBand } from "@/lib/quiz-types";
import type { AttemptAnswer, QuizQuestion } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/results/$id")({
  head: () => ({
    meta: [
      { title: "Your results — Smart Quiz" },
      { name: "description", content: "See your score, percentage and a full review of every question." },
      { property: "og:title", content: "Your results — Smart Quiz" },
      { property: "og:description", content: "See your score, percentage and a full review of every question." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["attempt", id],
    queryFn: async () => {
      const { data: attempt, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!attempt) return null;
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", attempt.quiz_id)
        .maybeSingle();
      return { attempt, quiz };
    },
  });

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

  if (!data?.attempt || !data.quiz) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-xl font-semibold">Results not found</h1>
          <Button asChild className="mt-4">
            <Link to="/">Build a new quiz</Link>
          </Button>
        </main>
      </div>
    );
  }

  const { attempt, quiz } = data;
  const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];
  const answers = (attempt.answers as unknown as AttemptAnswer[]) ?? [];
  const percentage = Math.round(Number(attempt.percentage));
  const band = scoreBand(percentage);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
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
                  {attempt.score}/{attempt.total}
                </span>
              </div>
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{band.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{band.note}</p>
            <p className="mt-3 text-sm font-medium">{quiz.title}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild variant="secondary">
                <Link to="/quiz/$id" params={{ id: quiz.id }}>
                  <RotateCcw className="size-4" /> Retake this quiz
                </Link>
              </Button>
              <ShareQuizButton quizId={quiz.id} title={quiz.title} variant="outline" />
              <Button asChild>
                <Link to="/">
                  <Sparkles className="size-4" /> Generate another quiz
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sharing creates a link friends can play without signing in.
            </p>

          </CardContent>
        </Card>

        <h2 className="mt-8 font-display text-lg font-semibold">Review</h2>
        <ul className="mt-3 space-y-3">
          {questions.map((question, i) => {
            const answer = answers.find((a) => a.questionIndex === i);
            const correct = answer?.correct ?? false;
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
                            You answered:{" "}
                            {answer ? (question.options[answer.selectedIndex] ?? "—") : "no answer"}
                          </p>
                        )}
                        {answer?.explanation && (
                          <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed">
                            {answer.explanation}
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
