import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileStack, Loader2, Upload } from "lucide-react";
import { extractQuestionBatch } from "@/lib/bulk-extract.functions";
import { fileToAllPageImages } from "@/lib/file-to-images";
import { guessChapter, guessDifficulty, guessSubject, normaliseDifficulty, normaliseSubject } from "@/lib/categorize";
import { OPTION_KEYS } from "@/lib/neet";
import { useBulkInsertQuestions, type QuestionInput } from "@/lib/questions";
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

const PAGES_PER_BATCH = 2;

export function BulkUploadPdf() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [rows, setRows] = useState<QuestionInput[]>([]);
  const [markPyq, setMarkPyq] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const runBatch = useServerFn(extractQuestionBatch);
  const bulkInsert = useBulkInsertQuestions();

  function reset() {
    setRows([]);
    setProgress(0);
    setStatusText("");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    reset();
    setBusy(true);
    try {
      setStatusText("Rendering PDF pages…");
      const pages = await fileToAllPageImages(file);
      const collected: QuestionInput[] = [];
      const batches = Math.ceil(pages.length / PAGES_PER_BATCH);

      for (let b = 0; b < batches; b++) {
        const slice = pages.slice(b * PAGES_PER_BATCH, (b + 1) * PAGES_PER_BATCH);
        setStatusText(`Reading pages ${b * PAGES_PER_BATCH + 1}–${b * PAGES_PER_BATCH + slice.length} of ${pages.length}…`);
        try {
          const extracted = await runBatch({ data: { images: slice } });
          for (const q of extracted) {
            const blob = `${q.question_text} ${q.option_a} ${q.option_b} ${q.option_c} ${q.option_d} ${q.chapter} ${q.major_topic}`;
            const subject = normaliseSubject(q.subject) ?? guessSubject(blob);
            const guessed = guessChapter(blob, subject);
            collected.push({
              subject,
              chapter: q.chapter || guessed.chapter,
              major_topic: q.major_topic || guessed.topic,
              difficulty: normaliseDifficulty(q.difficulty) ?? guessDifficulty(blob),
              is_pyq: q.is_pyq || markPyq,
              question_text: q.question_text,
              image_url: null,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              correct_answer: OPTION_KEYS[(q.correct_option ?? 1) - 1],
              explanation: q.explanation,
            });
          }
        } catch (err) {
          console.error("batch failed", err);
        }
        setProgress(Math.round(((b + 1) / batches) * 100));
        setRows([...collected]);
      }

      setStatusText(
        collected.length
          ? `${collected.length} questions ready to import.`
          : "No questions could be read from that file.",
      );
      if (!collected.length) toast.error("No questions found in that PDF");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
      setStatusText("");
    } finally {
      setBusy(false);
    }
  }

  async function importAll() {
    try {
      await bulkInsert.mutateAsync(rows);
      toast.success(`Imported ${rows.length} questions`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileStack className="size-4" /> Bulk Upload PDF
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (busy) return;
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk upload a NEET question paper</DialogTitle>
            <DialogDescription>
              Upload a full paper PDF. Every page is parsed automatically — question text, options
              1–4, explanation, subject, chapter, major topic and difficulty are filled in, so the
              questions appear instantly in every practice category.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-dashed border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Switch id="bulk-pyq" checked={markPyq} onCheckedChange={setMarkPyq} />
                <Label htmlFor="bulk-pyq" className="text-sm">
                  Mark all as previous year questions (PYQ)
                </Label>
              </div>
              <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {busy ? "Parsing…" : "Choose PDF"}
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleFile}
            />
            {(busy || statusText) && (
              <div className="mt-3 space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{statusText}</p>
              </div>
            )}
          </div>

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
                  {rows.map((r, i) => (
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || rows.length === 0 || bulkInsert.isPending}
              onClick={importAll}
            >
              {bulkInsert.isPending ? "Importing…" : `Import ${rows.length || ""} questions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
