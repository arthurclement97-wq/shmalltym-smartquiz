# Smart Quiz — AI Quiz Generator

An app where students upload study material and get an AI-generated quiz, with accounts and saved history.

## Pages

- `/` — landing + quiz builder (upload, options, generate). Redirects to sign-in when signed out.
- `/auth` — sign up / sign in (email + password, instant access, no email confirmation step).
- `/quiz/$id` — the quiz player, one question at a time.
- `/results/$id` — score summary, review of every question, restart or build a new quiz.
- `/history` — past quizzes and scores for the signed-in student.

## Quiz builder

- Upload a PDF or image, or paste text. Drag-and-drop with file preview and size validation.
- Number of questions (5–20 slider or custom ).
- Question type: Multiple Choice (4 options) or True/False.
- Optional timer: off, or a per-quiz countdown (e.g. 5/10/20 min).
- Generate button with a clear loading state; AI failures (out of credits, rate limit, bad file) surface as readable messages.

## Quiz player

- Progress header: "Question 3 of 20" plus a progress bar and, if enabled, the countdown timer (auto-submits at zero).
- One question per screen; selecting an answer locks it in.
- Correct choice turns green, a wrong pick turns red and the correct answer is revealed.
- "Explain Answer" button asks the AI for a short explanation grounded in the uploaded material, shown inline.
- Next button advances; last question goes to results.

## Results

- Score, percentage, ring/progress visual, and an encouraging message band (e.g. under 50%, 50–79%, 80%+).
- Full review list with your answer vs the correct one and any explanations you requested.
- Buttons: Retake this quiz, Generate another quiz.

## Design

Clean, student-friendly and responsive: soft light surface with a confident single accent color, rounded cards, generous spacing, large tap targets, and a mobile-first layout that scales to desktop. Green/red states are dedicated semantic tokens so they read well in light and dark mode.

## Technical notes

- Enable Lovable Cloud for accounts and storage of quiz history.
- Tables: `profiles`, `quizzes` (title, source type, settings, generated questions JSON), `quiz_attempts` (answers, score, percentage, completed_at). Row-level security scopes every row to its owner; grants issued per table.
- Secret: `OPENAI_API_KEY`, requested through secure secret storage after this plan is approved. Read only inside server handlers — never in frontend code or a `VITE_` variable.
- Two server functions (`createServerFn`, auth-required): `generateQuiz` and `explainAnswer`. Both call the OpenAI API server-side. PDFs and images are sent as base64 file/image blocks so the model reads the material directly; pasted text is sent as text. The prompt instructs the model to draw questions strictly from the supplied material and returns strict JSON (question, options, correct index, source hint).
- Files are uploaded to a private storage bucket owned by the user; the server function reads the bytes for the AI call.
- Per-route `head()` metadata for title/description/social tags.