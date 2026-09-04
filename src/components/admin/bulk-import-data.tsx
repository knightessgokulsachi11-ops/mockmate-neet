import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileStack, Loader2, Upload } from "lucide-react";
import { extractQuestionBatch } from "@/lib/bulk-extract.functions";
import { loadFilePages } from "@/lib/page-extract";
import { parseQuestionsFromText } from "@/lib/parse-questions";
import {
  guessChapter,
  guessDifficulty,
  guessSubject,
  normaliseDifficulty,
  normaliseSubject,
} from "@/lib/categorize";
import { OPTION_KEYS } from "@/lib/neet";
import { insertQuestionsChunked, type QuestionInput } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RawQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 1 | 2 | 3 | 4 | null;
  explanation: string;
  subject?: string | null;
  chapter?: string;
  major_topic?: string;
  difficulty?: string | null;
  is_pyq?: boolean;
}

export function BulkImportData() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<QuestionInput[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [markPyq, setMarkPyq] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const runBatch = useServerFn(extractQuestionBatch);

  function reset() {
    setRows([]);
    setIssues([]);
    setProgress(0);
    setStatus("");
  }

  function toRow(q: RawQuestion): QuestionInput {
    const blob = `${q.question_text} ${q.option_a} ${q.option_b} ${q.option_c} ${q.option_d} ${q.chapter ?? ""} ${q.major_topic ?? ""}`;
    const subject = normaliseSubject(q.subject ?? null) ?? guessSubject(blob);
    const guessed = guessChapter(blob, subject);
    return {
      subject,
      chapter: q.chapter || guessed.chapter,
      major_topic: q.major_topic || guessed.topic,
      difficulty: normaliseDifficulty(q.difficulty ?? null) ?? guessDifficulty(blob),
      is_pyq: q.is_pyq || markPyq,
      question_text: q.question_text,
      image_url: null,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: OPTION_KEYS[(q.correct_option ?? 1) - 1],
      explanation: q.explanation,
    } as unknown as QuestionInput;
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    reset();
    setBusy(true);
    const collected: QuestionInput[] = [];
    const problems: string[] = [];

    try {
      // Open every file first (page counts only) so progress is accurate.
      const loaded: { name: string; doc: Awaited<ReturnType<typeof loadFilePages>> }[] = [];
      for (const file of files) {
        setStatus(`Opening ${file.name}…`);
        try {
          const doc = await loadFilePages(file);
          if (doc.total > 0) loaded.push({ name: file.name, doc });
          else problems.push(`${file.name}: no pages found.`);
        } catch (err) {
          problems.push(`${file.name}: ${err instanceof Error ? err.message : "unreadable"}`);
        }
      }
      const totalPages = loaded.reduce((n, l) => n + l.doc.total, 0);
      if (!totalPages) throw new Error("No readable pages in the selected files.");

      let done = 0;
      for (const { name, doc } of loaded) {
        for (let i = 0; i < doc.total; i++) {
          setStatus(`Reading page ${done + 1} of ${totalPages}…`);
          try {
            const unit = await doc.get(i);
            const parsed = parseQuestionsFromText(unit.text);
            if (!parsed.needsAi && parsed.questions.length) {
              // OCR / text-layer extraction was reliable — no AI needed.
              parsed.questions.forEach((q) => collected.push(toRow(q)));
            } else {
              // Complex or unreliable page: let AI read the rendered page image.
              const image = await unit.getImage();
              const extracted = await runBatch({ data: { images: [image] } });
              extracted.forEach((q) => collected.push(toRow(q as RawQuestion)));
            }
          } catch (err) {
            problems.push(
              `${name}: page ${i + 1} failed — ${err instanceof Error ? err.message : "read error"}`,
            );
          }
          done++;
          setProgress(Math.round((done / totalPages) * 100));
          setRows([...collected]);
        }
        doc.close();
      }

      setIssues(problems.slice(0, 50));
      setStatus(
        collected.length
          ? `${collected.length.toLocaleString()} questions read from ${files.length} file${files.length === 1 ? "" : "s"}.`
          : "No questions could be read from those files.",
      );
      if (!collected.length) toast.error("No questions found");
    } catch (err) {
      setIssues(problems.slice(0, 50));
      toast.error(err instanceof Error ? err.message : "Could not read those files");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setImporting(true);
    setProgress(0);
    try {
      const res = await insertQuestionsChunked(rows, (done, total) => {
        setProgress(Math.round((done / total) * 100));
        setStatus(`Imported ${done.toLocaleString()} of ${total.toLocaleString()}…`);
      });
      await qc.invalidateQueries({ queryKey: ["questions"] });
      if (res.failed) {
        toast.error(`${res.inserted} imported, ${res.failed} failed`);
        setIssues(res.errors);
      } else {
        toast.success(`Imported ${res.inserted.toLocaleString()} questions`);
        setOpen(false);
        reset();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const locked = busy || importing;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileStack className="size-4" /> Bulk Import PDF / Images
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (locked) return;
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk import questions from PDFs or images</DialogTitle>
            <DialogDescription>
              Select one or many question papers (PDF, JPG, PNG). Every page is rendered and read
              by AI, so both text-based and scanned/handwritten PDFs work. Question text, options
              1–4, correct answer, explanation, subject, chapter, topic and difficulty are filled
              in automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-dashed border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Switch id="import-pyq" checked={markPyq} onCheckedChange={setMarkPyq} />
                <Label htmlFor="import-pyq" className="text-sm">
                  Mark all as previous year questions (PYQ)
                </Label>
              </div>
              <Button type="button" disabled={locked} onClick={() => fileRef.current?.click()}>
                {locked ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {busy ? "Reading…" : importing ? "Importing…" : "Choose files"}
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleFiles}
            />
            {(locked || status) && (
              <div className="mt-3 space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{status}</p>
              </div>
            )}
          </div>

          {issues.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border border-border p-3 text-xs">
              {issues.map((msg, i) => (
                <p key={i} className="text-muted-foreground">
                  {msg}
                </p>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-md border border-border">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">#</th>
                    <th className="px-2 py-1.5 font-medium">Question</th>
                    <th className="px-2 py-1.5 font-medium">Subject</th>
                    <th className="px-2 py-1.5 font-medium">Chapter / Topic</th>
                    <th className="px-2 py-1.5 font-medium">Level</th>
                    <th className="px-2 py-1.5 font-medium">Ans</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="max-w-xs px-2 py-1.5">
                        <span className="line-clamp-2">{r.question_text}</span>
                      </td>
                      <td className="px-2 py-1.5">{r.subject}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {r.chapter}
                        {r.major_topic ? ` · ${r.major_topic}` : ""}
                      </td>
                      <td className="px-2 py-1.5">{r.difficulty}</td>
                      <td className="px-2 py-1.5 font-semibold">{r.correct_answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 200 && (
                <p className="border-t border-border p-2 text-xs text-muted-foreground">
                  Showing first 200 of {rows.length.toLocaleString()} questions.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={locked} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={locked || rows.length === 0} onClick={runImport}>
              {importing ? "Importing…" : `Import ${rows.length.toLocaleString() || ""} questions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
