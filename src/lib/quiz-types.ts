export type QuestionType = "mcq" | "truefalse";
export type SourceType = "pdf" | "image" | "text";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  sourceHint?: string | undefined;
}

export interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
}

export interface AttemptAnswer {
  questionIndex: number;
  selectedIndex: number;
  correct: boolean;
  explanation?: string | undefined;
}

export function scoreBand(percentage: number) {
  if (percentage >= 80)
    return { label: "Outstanding!", note: "You clearly know this material." };
  if (percentage >= 50)
    return { label: "Good effort", note: "A little more revision and you've got it." };
  return { label: "Keep going", note: "Review the material and try again — you'll improve fast." };
}
