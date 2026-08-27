import { useState } from "react";
import { Check, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function ShareQuizButton({
  quizId,
  title,
  variant = "secondary",
}: {
  quizId: string;
  title?: string | undefined;
  variant?: "secondary" | "ghost" | "outline";
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .update({ is_public: true })
        .eq("id", quizId)
        .select("share_token")
        .single();
      if (error || !data) throw new Error("Could not create a share link.");

      const url = `${window.location.origin}/s/${data.share_token}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: title ?? "Smart Quiz", url });
          return;
        } catch {
          /* fall through to clipboard */
        }
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied — friends can play without an account.");
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share this quiz.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} onClick={share} disabled={busy}>
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : copied ? (
        <Check className="size-4" />
      ) : (
        <Share2 className="size-4" />
      )}
      {copied ? "Link copied" : "Share quiz"}
    </Button>
  );
}
