import type { Subject } from "./neet";

/**
 * Fixed monthly syllabus plan for NEET 2027.
 * Each month's cumulative test = every chapter from all previous months + this month.
 * Chapter coverage is fixed; only the questions drawn from the bank vary.
 */
export interface MonthPlan {
  id: string;
  label: string;
  chapters: Record<Subject, string[]>;
}

export const MONTHLY_PLAN: MonthPlan[] = [
  {
    id: "2026-04",
    label: "April 2026",
    chapters: {
      Physics: ["Units and Measurements", "Motion in a Straight Line"],
      Chemistry: ["Some Basic Concepts of Chemistry", "Structure of Atom"],
      Botany: ["The Living World", "Biological Classification"],
      Zoology: ["Animal Kingdom"],
    },
  },
  {
    id: "2026-05",
    label: "May 2026",
    chapters: {
      Physics: ["Motion in a Plane", "Laws of Motion"],
      Chemistry: ["Classification of Elements and Periodicity in Properties"],
      Botany: ["Plant Kingdom", "Morphology of Flowering Plants"],
      Zoology: ["Structural Organisation in Animals"],
    },
  },
  {
    id: "2026-06",
    label: "June 2026",
    chapters: {
      Physics: ["Work, Energy and Power", "System of Particles and Rotational Motion"],
      Chemistry: ["Chemical Bonding and Molecular Structure"],
      Botany: ["Anatomy of Flowering Plants", "Cell: The Unit of Life"],
      Zoology: ["Biomolecules"],
    },
  },
  {
    id: "2026-07",
    label: "July 2026",
    chapters: {
      Physics: ["Gravitation", "Mechanical Properties of Solids"],
      Chemistry: ["Thermodynamics", "Equilibrium"],
      Botany: ["Cell Cycle and Cell Division", "Photosynthesis in Higher Plants"],
      Zoology: ["Breathing and Exchange of Gases"],
    },
  },
  {
    id: "2026-08",
    label: "August 2026",
    chapters: {
      Physics: ["Mechanical Properties of Fluids", "Thermal Properties of Matter"],
      Chemistry: ["Redox Reactions", "The p-Block Elements (Group 13 & 14)"],
      Botany: ["Respiration in Plants", "Plant Growth and Development"],
      Zoology: ["Body Fluids and Circulation", "Excretory Products and their Elimination"],
    },
  },
  {
    id: "2026-09",
    label: "September 2026",
    chapters: {
      Physics: ["Thermodynamics", "Kinetic Theory"],
      Chemistry: ["Organic Chemistry: Some Basic Principles and Techniques", "Hydrocarbons"],
      Botany: ["Transport in Plants", "Mineral Nutrition"],
      Zoology: ["Locomotion and Movement", "Neural Control and Coordination"],
    },
  },
  {
    id: "2026-10",
    label: "October 2026",
    chapters: {
      Physics: ["Oscillations", "Waves"],
      Chemistry: ["Solutions", "Electrochemistry"],
      Botany: ["Sexual Reproduction in Flowering Plants"],
      Zoology: ["Chemical Coordination and Integration", "Human Reproduction"],
    },
  },
  {
    id: "2026-11",
    label: "November 2026",
    chapters: {
      Physics: ["Electric Charges and Fields", "Electrostatic Potential and Capacitance"],
      Chemistry: ["Chemical Kinetics", "The d- and f-Block Elements"],
      Botany: ["Principles of Inheritance and Variation"],
      Zoology: ["Reproductive Health", "Molecular Basis of Inheritance"],
    },
  },
  {
    id: "2026-12",
    label: "December 2026",
    chapters: {
      Physics: ["Current Electricity", "Moving Charges and Magnetism"],
      Chemistry: ["Coordination Compounds", "Haloalkanes and Haloarenes"],
      Botany: ["Microbes in Human Welfare"],
      Zoology: ["Evolution", "Human Health and Disease"],
    },
  },
  {
    id: "2027-01",
    label: "January 2027",
    chapters: {
      Physics: ["Magnetism and Matter", "Electromagnetic Induction", "Alternating Current"],
      Chemistry: ["Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids"],
      Botany: ["Biotechnology: Principles and Processes"],
      Zoology: ["Biotechnology and its Applications"],
    },
  },
  {
    id: "2027-02",
    label: "February 2027",
    chapters: {
      Physics: ["Electromagnetic Waves", "Ray Optics and Optical Instruments", "Wave Optics"],
      Chemistry: ["Amines", "Biomolecules"],
      Botany: ["Organisms and Populations", "Ecosystem"],
      Zoology: ["Biodiversity and Conservation"],
    },
  },
  {
    id: "2027-03",
    label: "March 2027",
    chapters: {
      Physics: ["Dual Nature of Radiation and Matter", "Atoms", "Nuclei", "Semiconductor Electronics"],
      Chemistry: ["The p-Block Elements (Group 15 to 18)", "Principles Related to Practical Chemistry"],
      Botany: ["Strategies for Enhancement in Food Production"],
      Zoology: ["Environmental Issues"],
    },
  },
];

export const MONTHLY_CATEGORIES = ["all", "Physics", "Chemistry", "Biology"] as const;
export type MonthlyCategory = (typeof MONTHLY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MonthlyCategory, string> = {
  all: "All Subjects",
  Physics: "Physics",
  Chemistry: "Chemistry",
  Biology: "Biology (Botany + Zoology)",
};

export const CATEGORY_SUBJECTS: Record<MonthlyCategory, Subject[]> = {
  all: ["Physics", "Chemistry", "Botany", "Zoology"],
  Physics: ["Physics"],
  Chemistry: ["Chemistry"],
  Biology: ["Botany", "Zoology"],
};

export function monthIndex(id: string) {
  return MONTHLY_PLAN.findIndex((m) => m.id === id);
}

/** Fixed cumulative coverage: this month + every earlier month. */
export function cumulativeChapters(monthId: string): Record<Subject, string[]> {
  const idx = monthIndex(monthId);
  const out: Record<Subject, string[]> = {
    Physics: [],
    Chemistry: [],
    Botany: [],
    Zoology: [],
  };
  if (idx < 0) return out;
  for (let i = 0; i <= idx; i++) {
    const m = MONTHLY_PLAN[i]!;
    (Object.keys(out) as Subject[]).forEach((s) => {
      for (const c of m.chapters[s]) if (!out[s].includes(c)) out[s].push(c);
    });
  }
  return out;
}

export function chaptersFor(monthId: string, category: MonthlyCategory) {
  const all = cumulativeChapters(monthId);
  return CATEGORY_SUBJECTS[category].map((s) => ({ subject: s, chapters: all[s] }));
}
