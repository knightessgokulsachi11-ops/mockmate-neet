import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, Download, Loader2, Upload } from "lucide-react";
import {
  IMPORT_TEMPLATE_HEADERS,
  parseCsvFileStreaming,
  parseExcelFile,
  parseJsonFile,
  recordsToRows,
  type ImportIssue,
} from "@/lib/import-questions";
import { insertQuestionsChunked, type QuestionInput } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function BulkImportData() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<QuestionInput[]>([]);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [skipped, setSkipped] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setIssues([]);
    setSkipped(0);
    setProgress(0);
    setStatus("");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    reset();
    setBusy(true);
    try {
      const name = file.name.toLowerCase();
      setStatus(`Reading ${file.name}…`);
      let records: Record<string, unknown>[];
      if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
        records = await parseCsvFileStreaming(file, setProgress);
      } else if (name.endsWith(".json")) {
        records = await parseJsonFile(file);
        setProgress(100);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        records = await parseExcelFile(file);
        setProgress(100);
      } else {
        throw new Error("Upload a .csv, .xlsx, .xls or .json file.");
      }

      const parsed = recordsToRows(records);
      setRows(parsed.rows);
      setIssues(parsed.issues);
      setSkipped(parsed.total - parsed.rows.length);
      setStatus(
        `${parsed.rows.length.toLocaleString()} valid of ${parsed.total.toLocaleString()} rows parsed.`,
      );
      if (!parsed.rows.length) toast.error("No valid questions found in that file");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
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
        setIssues(res.errors.map((message, i) => ({ row: i + 1, message })));
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

  function downloadTemplate() {
    const csv = `${IMPORT_TEMPLATE_HEADERS.join(",")}\n"What is the SI unit of force?","Newton","Joule","Watt","Pascal",1,"Force is measured in newtons.","Physics","Laws of Motion","Units",Easy,false\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "neet-question-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const locked = busy || importing;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Database className="size-4" /> Import Excel / CSV / JSON
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (locked) return;
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk import questions</DialogTitle>
            <DialogDescription>
              Upload a large .csv, .xlsx or .json dataset. Big files are streamed in chunks and
              written to the bank in batches, so tens of thousands of questions import smoothly.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-dashed border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Columns: question_text, option_a–d, correct_answer (1–4 or A–D), explanation,
                subject, chapter, major_topic, difficulty, is_pyq.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={downloadTemplate}>
                  <Download className="size-4" /> Template
                </Button>
                <Button type="button" disabled={locked} onClick={() => fileRef.current?.click()}>
                  {locked ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {busy ? "Reading…" : importing ? "Importing…" : "Choose file"}
                </Button>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            {(locked || status) && (
              <div className="mt-3 space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{status}</p>
              </div>
            )}
          </div>

          {skipped > 0 && (
            <p className="text-xs text-destructive">
              {skipped.toLocaleString()} row{skipped === 1 ? "" : "s"} skipped due to missing or
              invalid fields.
            </p>
          )}

          {issues.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border border-border p-3 text-xs">
              {issues.map((iss, i) => (
                <p key={i} className="text-muted-foreground">
                  Row {iss.row}: {iss.message}
                </p>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">#</th>
                    <th className="px-2 py-1.5 font-medium">Question</th>
                    <th className="px-2 py-1.5 font-medium">Subject</th>
                    <th className="px-2 py-1.5 font-medium">Chapter</th>
                    <th className="px-2 py-1.5 font-medium">Ans</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="max-w-xs px-2 py-1.5">
                        <span className="line-clamp-2">{r.question_text}</span>
                      </td>
                      <td className="px-2 py-1.5">{r.subject}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.chapter}</td>
                      <td className="px-2 py-1.5 font-semibold">{r.correct_answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <p className="border-t border-border p-2 text-xs text-muted-foreground">
                  Showing first 100 of {rows.length.toLocaleString()} rows.
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
