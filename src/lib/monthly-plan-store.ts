import { useCallback, useEffect, useState } from "react";
import type { Subject } from "./neet";
import { SUBJECTS } from "./neet";
import { MONTHLY_PLAN } from "./monthly-plan";

/** User-defined chapters per month. Nothing is added automatically. */
export type MonthChapters = Record<Subject, string[]>;
export type CustomPlan = Record<string, MonthChapters>;

const STORAGE_KEY = "leopardus.monthly-plan.v1";

export function emptyMonth(): MonthChapters {
  return { Physics: [], Chemistry: [], Botany: [], Zoology: [] };
}

export function emptyPlan(): CustomPlan {
  const out: CustomPlan = {};
  for (const m of MONTHLY_PLAN) out[m.id] = emptyMonth();
  return out;
}

function normalize(raw: unknown): CustomPlan {
  const plan = emptyPlan();
  if (!raw || typeof raw !== "object") return plan;
  for (const [id, months] of Object.entries(raw as Record<string, unknown>)) {
    if (!plan[id]) plan[id] = emptyMonth();
    if (!months || typeof months !== "object") continue;
    for (const s of SUBJECTS) {
      const list = (months as Record<string, unknown>)[s];
      if (Array.isArray(list)) {
        plan[id]![s] = Array.from(new Set(list.filter((c): c is string => typeof c === "string")));
      }
    }
  }
  return plan;
}

export function loadPlan(): CustomPlan {
  if (typeof window === "undefined") return emptyPlan();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyPlan();
  } catch {
    return emptyPlan();
  }
}

export function savePlan(plan: CustomPlan) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    /* storage unavailable */
  }
}

export function useMonthlyPlan() {
  const [plan, setPlan] = useState<CustomPlan>(() => emptyPlan());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPlan(loadPlan());
    setHydrated(true);
  }, []);

  const update = useCallback((next: CustomPlan) => {
    setPlan(next);
    savePlan(next);
  }, []);

  const setMonthSubject = useCallback(
    (monthId: string, subject: Subject, chapters: string[]) => {
      setPlan((prev) => {
        const month = { ...(prev[monthId] ?? emptyMonth()), [subject]: chapters };
        const next = { ...prev, [monthId]: month };
        savePlan(next);
        return next;
      });
    },
    [],
  );

  const clearMonth = useCallback((monthId: string) => {
    setPlan((prev) => {
      const next = { ...prev, [monthId]: emptyMonth() };
      savePlan(next);
      return next;
    });
  }, []);

  return { plan, hydrated, setPlan: update, setMonthSubject, clearMonth };
}

/** Cumulative = this month plus every earlier month, using only user-chosen chapters. */
export function cumulativeFromPlan(
  plan: CustomPlan,
  monthId: string,
  cumulative: boolean,
): MonthChapters {
  const idx = MONTHLY_PLAN.findIndex((m) => m.id === monthId);
  const out = emptyMonth();
  if (idx < 0) return out;
  const from = cumulative ? 0 : idx;
  for (let i = from; i <= idx; i++) {
    const month = plan[MONTHLY_PLAN[i]!.id];
    if (!month) continue;
    for (const s of SUBJECTS) {
      for (const c of month[s]) if (!out[s].includes(c)) out[s].push(c);
    }
  }
  return out;
}
