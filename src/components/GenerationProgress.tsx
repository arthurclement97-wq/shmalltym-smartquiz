import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function estimateSeconds(questionCount: number, heavySource: boolean) {
  return Math.round(10 + questionCount * 1.2 + (heavySource ? 12 : 0));
}

/** Full-screen overlay with a live countdown while the AI builds the quiz. */
export function GenerationProgress({
  estimate,
  label,
}: {
  estimate: number;
  label: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, estimate - elapsed);
  const pct = Math.min(97, Math.round((elapsed / Math.max(1, estimate)) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold">{label}</h2>

        <div
          className="mt-5 font-display text-4xl font-bold tabular-nums"
          aria-live="polite"
        >
          {remaining > 0 ? `${remaining}s` : "Almost there"}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {remaining > 0 ? "Estimated time remaining" : "Finishing up — hang tight"}
        </p>

        <Progress value={pct} className="mt-5" />
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Please keep this page open
        </p>
      </div>
    </div>
  );
}
