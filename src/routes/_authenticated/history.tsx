import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileQuestion, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Your quiz history — Smart Quiz" },
      { name: "description", content: "Review every quiz you generated and the scores you achieved." },
      { property: "og:title", content: "Your quiz history — Smart Quiz" },
      { property: "og:description", content: "Review every quiz you generated and the scores you achieved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const [{ data: quizzes }, { data: attempts }] = await Promise.all([
        supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
        supabase.from("quiz_attempts").select("*").order("completed_at", { ascending: false }),
      ]);
      return { quizzes: quizzes ?? [], attempts: attempts ?? [] };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">Your quizzes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every quiz you've generated, newest first.</p>

        {isLoading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.quizzes.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {data.quizzes.map((quiz) => {
              const best = data.attempts
                .filter((a) => a.quiz_id === quiz.id)
                .sort((a, b) => Number(b.percentage) - Number(a.percentage))[0];
              return (
                <li key={quiz.id}>
                  <Card className="border-border/70 transition-shadow hover:shadow-sm">
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{quiz.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">
                            {quiz.question_type === "mcq" ? "Multiple choice" : "True / False"}
                          </Badge>
                          <span>{quiz.question_count} questions</span>
                          {best ? (
                            <span className="font-medium text-success">
                              Best: {Math.round(Number(best.percentage))}%
                            </span>
                          ) : (
                            <span>Not attempted</span>
                          )}
                        </div>
                      </div>
                      <Button asChild size="sm" variant="secondary">
                        <Link to="/quiz/$id" params={{ id: quiz.id }}>
                          Take <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="mt-8 border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FileQuestion className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No quizzes yet.</p>
              <Button asChild>
                <Link to="/">Generate your first quiz</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
