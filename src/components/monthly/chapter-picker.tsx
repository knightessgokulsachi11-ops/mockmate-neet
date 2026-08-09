import { useMemo, useState } from "react";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChapterList } from "@/lib/questions";
import type { Subject } from "@/lib/neet";

interface Props {
  subject: Subject;
  selected: string[];
  onChange: (chapters: string[]) => void;
}

export function ChapterPicker({ subject, selected, onChange }: Props) {
  const { data: chapters = [], isLoading } = useChapterList(subject);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");

  const options = useMemo(() => {
    const names = new Set<string>(chapters.map((c) => c.chapter));
    for (const s of selected) names.add(s);
    const list = Array.from(names).sort((a, b) => a.localeCompare(b));
    const q = query.trim().toLowerCase();
    return q ? list.filter((c) => c.toLowerCase().includes(q)) : list;
  }, [chapters, selected, query]);

  const toggle = (chapter: string) =>
    onChange(
      selected.includes(chapter) ? selected.filter((c) => c !== chapter) : [...selected, chapter],
    );

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (!selected.includes(name)) onChange([...selected, name]);
    setCustom("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {subject} · {selected.length} selected
        </Label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3" /> Clear
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${subject} chapters`}
          className="h-8 pl-7 text-sm"
        />
      </div>

      <div className="max-h-52 space-y-1 overflow-y-auto rounded-sm border border-border p-1.5">
        {isLoading && <p className="p-2 text-xs text-muted-foreground">Loading chapters…</p>}
        {!isLoading && options.length === 0 && (
          <p className="p-2 text-xs text-muted-foreground">
            No chapters found in the question bank. Add one manually below.
          </p>
        )}
        {options.map((c) => {
          const on = selected.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c)}
              className={
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors " +
                (on ? "bg-accent text-accent-foreground" : "hover:bg-muted/60")
              }
            >
              <span
                className={
                  "flex size-4 shrink-0 items-center justify-center rounded-[3px] border " +
                  (on ? "border-primary bg-primary text-primary-foreground" : "border-border")
                }
              >
                {on && <Check className="size-3" />}
              </span>
              <span className="truncate">{c}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add a chapter name"
          className="h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={addCustom}>
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
