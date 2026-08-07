import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Search, Upload, Loader2 } from "lucide-react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { BulkUploadPdf } from "@/components/admin/bulk-upload";
import { BulkImportData } from "@/components/admin/bulk-import-data";

import { useIsAdmin } from "@/hooks/use-auth";
import {
  useDeleteQuestion,
  useQuestionCount,
  useQuestionPages,
  useSaveQuestion,
  type QuestionInput,
} from "@/lib/questions";
import { DIFFICULTIES, OPTION_KEYS, SUBJECTS, type Question } from "@/lib/neet";
import { extractQuestion } from "@/lib/extract-question.functions";
import { fileToPageImages } from "@/lib/file-to-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — NEET 2027 Question Bank" },
      {
        name: "description",
        content: "Add, edit and delete NEET practice questions in your synced question bank.",
      },
      { property: "og:title", content: "Admin — NEET 2027 Question Bank" },
      {
        property: "og:description",
        content: "Manage the NEET 2027 question bank from any device.",
      },
    ],
  }),
  component: AdminPage,
});

const schema = z.object({
  subject: z.enum(SUBJECTS),
  chapter: z.string().trim().min(1, "Chapter is required").max(120),
  major_topic: z.string().trim().max(120),
  difficulty: z.enum(DIFFICULTIES),
  is_pyq: z.boolean(),
  question_text: z.string().trim().min(1, "Question is required").max(4000),
  image_url: z.string().trim().url("Image must be a valid URL").max(2000).or(z.literal("")),
  option_a: z.string().trim().min(1, "Option A is required").max(1000),
  option_b: z.string().trim().min(1, "Option B is required").max(1000),
  option_c: z.string().trim().min(1, "Option C is required").max(1000),
  option_d: z.string().trim().min(1, "Option D is required").max(1000),
  correct_answer: z.enum(OPTION_KEYS),
  explanation: z.string().trim().max(4000),
});

const emptyForm = {
  subject: "Physics",
  chapter: "",
  major_topic: "",
  difficulty: "Medium",
  is_pyq: false,
  question_text: "",
  image_url: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
  explanation: "",
} as unknown as QuestionInput;

function AdminPage() {
  const { isAdmin, checking } = useIsAdmin();
  const save = useSaveQuestion();
  const remove = useDeleteQuestion();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionInput>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("__all__");
  const [extracting, setExtracting] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const runExtract = useServerFn(extractQuestion);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(
    () => ({ subject: subjectFilter, search: debounced }),
    [subjectFilter, debounced],
  );
  const {
    data: pages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useQuestionPages(filters);
  const { data: totalCount = 0 } = useQuestionCount(filters);
  const rows = useMemo(() => (pages?.pages ?? []).flat(), [pages]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setExtracting(true);
    setUploadName(file.name);
    try {
      const images = await fileToPageImages(file);
      const data = await runExtract({ data: { images } });
      setForm((prev) => ({
        ...prev,
        question_text: data.question_text || prev.question_text,
        option_a: data.option_a || prev.option_a,
        option_b: data.option_b || prev.option_b,
        option_c: data.option_c || prev.option_c,
        option_d: data.option_d || prev.option_d,
        explanation: data.explanation || prev.explanation,
        chapter: data.chapter || prev.chapter,
        major_topic: data.major_topic || prev.major_topic,
        subject: (SUBJECTS as readonly string[]).includes(data.subject ?? "")
          ? (data.subject as Question["subject"])
          : prev.subject,
        difficulty: (DIFFICULTIES as readonly string[]).includes(data.difficulty ?? "")
          ? (data.difficulty as Question["difficulty"])
          : prev.difficulty,
        is_pyq: data.is_pyq || prev.is_pyq,
        correct_answer: data.correct_option
          ? OPTION_KEYS[data.correct_option - 1]
          : prev.correct_answer,
      }));
      toast.success(
        data.correct_option
          ? `Extracted — correct option ${data.correct_option} (${OPTION_KEYS[data.correct_option - 1]})`
          : "Extracted — please set the correct option",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not extract that file");
    } finally {
      setExtracting(false);
    }
  }


  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    const { id: _id, created_at: _c, ...rest } = q;
    setForm({ ...rest, image_url: q.image_url ?? "" });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }
    const values = {
      ...parsed.data,
      image_url: parsed.data.image_url ? parsed.data.image_url : null,
    } as unknown as QuestionInput;
    try {
      await save.mutateAsync({ id: editing?.id, values });
      toast.success(editing ? "Question updated" : "Question added");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save question");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await remove.mutateAsync(deleteId);
      toast.success("Question deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete question");
    }
    setDeleteId(null);
  }

  if (checking) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Admin access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account is not the admin of the question bank.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Back to home</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalCount.toLocaleString()} question{totalCount === 1 ? "" : "s"} · synced across
              all your devices.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BulkUploadPdf />
            <BulkImportData />
            <Button onClick={openNew}>
              <Plus className="size-4" /> Add question
            </Button>
          </div>

        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search question, chapter or topic"
              value={search}
              maxLength={120}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All subjects</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="exam-surface mt-4 overflow-x-auto rounded-md">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No questions yet.</p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Chapter / Topic</th>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">Ans</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id} className="border-t border-border align-top">
                    <td className="max-w-sm px-3 py-2">
                      <span className="line-clamp-2">{q.question_text}</span>
                      {q.is_pyq && (
                        <span className="mt-1 inline-block rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                          PYQ
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{q.subject}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {q.chapter}
                      {q.major_topic ? ` · ${q.major_topic}` : ""}
                    </td>
                    <td className="px-3 py-2">{q.difficulty}</td>
                    <td className="px-3 py-2 font-semibold">{q.correct_answer}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(q.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit question" : "Add question"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Auto-fill from PDF or screenshot</p>
                  <p className="text-xs text-muted-foreground">
                    Upload a NEET question image or PDF — text, options 1–4, correct option and
                    explanation are filled automatically.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={extracting}
                  onClick={() => fileRef.current?.click()}
                >
                  {extracting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {extracting ? "Extracting…" : "Upload file"}
                </Button>
              </div>
              {uploadName && (
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  {extracting ? "Reading" : "Loaded"}: {uploadName}
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select
                  value={form.subject}
                  onValueChange={(v) => setForm({ ...form, subject: v as Question["subject"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) =>
                    setForm({ ...form, difficulty: v as Question["difficulty"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chapter">Chapter</Label>
                <Input
                  id="chapter"
                  value={form.chapter}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">Major topic</Label>
                <Input
                  id="topic"
                  value={form.major_topic}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, major_topic: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-sm border border-border p-3">
              <Switch
                id="pyq"
                checked={form.is_pyq}
                onCheckedChange={(v) => setForm({ ...form, is_pyq: v })}
              />
              <Label htmlFor="pyq">Previous year question (PYQ)</Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qt">Question</Label>
              <Textarea
                id="qt"
                rows={4}
                maxLength={4000}
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="img">Image URL (optional)</Label>
              <Input
                id="img"
                value={form.image_url ?? ""}
                maxLength={2000}
                placeholder="https://…"
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["option_a", "Option 1 (A)"],
                  ["option_b", "Option 2 (B)"],
                  ["option_c", "Option 3 (C)"],
                  ["option_d", "Option 4 (D)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    value={form[key]}
                    maxLength={1000}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Correct option (1, 2, 3 or 4)</Label>
              <Select
                value={form.correct_answer}
                onValueChange={(v) =>
                  setForm({ ...form, correct_answer: v as Question["correct_answer"] })
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTION_KEYS.map((k, i) => (
                    <SelectItem key={k} value={k}>
                      Option {i + 1} ({k})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This is the option marked correct in the CBT test screen.
              </p>
            </div>



            <div className="space-y-1.5">
              <Label htmlFor="exp">Explanation</Label>
              <Textarea
                id="exp"
                rows={3}
                maxLength={4000}
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {editing ? "Save changes" : "Add question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
