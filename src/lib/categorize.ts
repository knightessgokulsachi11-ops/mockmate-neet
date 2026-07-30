/** Keyword-based auto-categorisation for bulk-imported NEET questions. */
import { DIFFICULTIES, SUBJECTS, type Difficulty, type Subject } from "./neet";

type Rule = { chapter: string; topic: string; words: string[] };

const RULES: Record<Subject, Rule[]> = {
  Physics: [
    { chapter: "Units and Measurements", topic: "Dimensions", words: ["dimension", "significant figure", "si unit", "error in measurement"] },
    { chapter: "Motion in a Straight Line", topic: "Kinematics", words: ["velocity", "acceleration", "displacement", "projectile", "free fall"] },
    { chapter: "Laws of Motion", topic: "Newton's Laws", words: ["friction", "newton's law", "tension", "inclined plane", "impulse"] },
    { chapter: "Work, Energy and Power", topic: "Energy", words: ["kinetic energy", "potential energy", "work done", "power", "collision"] },
    { chapter: "Rotational Motion", topic: "Rigid Body", words: ["torque", "moment of inertia", "angular momentum", "centre of mass"] },
    { chapter: "Gravitation", topic: "Gravitation", words: ["gravitation", "escape velocity", "orbital", "satellite", "kepler"] },
    { chapter: "Thermodynamics", topic: "Heat", words: ["thermodynamic", "isothermal", "adiabatic", "entropy", "carnot", "specific heat"] },
    { chapter: "Oscillations and Waves", topic: "SHM and Waves", words: ["simple harmonic", "oscillat", "pendulum", "wavelength", "doppler", "resonance"] },
    { chapter: "Electrostatics", topic: "Electric Field", words: ["charge", "electric field", "capacitor", "coulomb", "potential difference", "dielectric"] },
    { chapter: "Current Electricity", topic: "Circuits", words: ["resistance", "ohm", "ammeter", "wheatstone", "current through", "emf"] },
    { chapter: "Magnetism", topic: "Magnetic Effects", words: ["magnetic field", "solenoid", "inductance", "lorentz", "cyclotron"] },
    { chapter: "Ray and Wave Optics", topic: "Optics", words: ["lens", "mirror", "refractive index", "interference", "diffraction", "polaris"] },
    { chapter: "Modern Physics", topic: "Atoms and Nuclei", words: ["photoelectric", "de broglie", "nucleus", "half life", "bohr", "semiconductor", "transistor", "logic gate"] },
  ],
  Chemistry: [
    { chapter: "Some Basic Concepts of Chemistry", topic: "Mole Concept", words: ["mole", "molar mass", "empirical formula", "stoichiometr"] },
    { chapter: "Structure of Atom", topic: "Atomic Structure", words: ["orbital", "quantum number", "aufbau", "hund", "azimuthal"] },
    { chapter: "Chemical Bonding", topic: "Bonding", words: ["hybridis", "hybridiz", "bond order", "vsepr", "molecular orbital", "dipole moment"] },
    { chapter: "Thermodynamics", topic: "Chemical Energetics", words: ["enthalpy", "gibbs", "entropy", "hess"] },
    { chapter: "Equilibrium", topic: "Ionic Equilibrium", words: ["equilibrium", "buffer", "ph of", "ksp", "le chatelier"] },
    { chapter: "Redox and Electrochemistry", topic: "Electrochemistry", words: ["oxidation state", "redox", "electrode potential", "electrolysis", "nernst"] },
    { chapter: "Chemical Kinetics", topic: "Rate of Reaction", words: ["rate constant", "order of reaction", "activation energy", "half-life of reaction"] },
    { chapter: "p-Block Elements", topic: "Inorganic", words: ["p-block", "halogen", "noble gas", "interhalogen", "boron", "silicate"] },
    { chapter: "d- and f-Block Elements", topic: "Transition Elements", words: ["d-block", "f-block", "lanthan", "actin", "transition element"] },
    { chapter: "Coordination Compounds", topic: "Coordination", words: ["ligand", "coordination", "crystal field", "chelat"] },
    { chapter: "Organic Chemistry Basics", topic: "GOC", words: ["resonance structure", "inductive effect", "electrophile", "nucleophile", "carbocation"] },
    { chapter: "Hydrocarbons", topic: "Hydrocarbons", words: ["alkane", "alkene", "alkyne", "benzene", "aromatic"] },
    { chapter: "Organic Functional Groups", topic: "Functional Groups", words: ["alcohol", "aldehyde", "ketone", "carboxylic", "amine", "ester", "haloalkane"] },
    { chapter: "Biomolecules and Polymers", topic: "Biomolecules", words: ["carbohydrate", "protein structure", "nucleic acid", "polymer", "vitamin"] },
  ],
  Botany: [
    { chapter: "Cell: The Unit of Life", topic: "Cell Biology", words: ["cell wall", "chloroplast", "plastid", "vacuole", "golgi", "ribosome"] },
    { chapter: "Plant Kingdom", topic: "Classification", words: ["algae", "bryophyt", "pteridophyt", "gymnosperm", "angiosperm"] },
    { chapter: "Morphology of Flowering Plants", topic: "Morphology", words: ["inflorescence", "placentation", "aestivation", "root system", "leaf venation"] },
    { chapter: "Photosynthesis", topic: "Plant Physiology", words: ["photosynthesis", "calvin", "c4 pathway", "photorespiration", "stomata"] },
    { chapter: "Respiration in Plants", topic: "Plant Physiology", words: ["glycolysis", "krebs", "respiratory quotient"] },
    { chapter: "Plant Growth and Development", topic: "Hormones", words: ["auxin", "gibberellin", "cytokinin", "abscisic", "ethylene", "vernali"] },
    { chapter: "Sexual Reproduction in Flowering Plants", topic: "Reproduction", words: ["pollen", "double fertilis", "double fertiliz", "embryo sac", "endosperm", "apomixis"] },
    { chapter: "Genetics and Evolution", topic: "Genetics", words: ["mendel", "dihybrid", "linkage", "dna replication", "transcription", "operon", "evolution"] },
    { chapter: "Ecology", topic: "Ecology", words: ["ecosystem", "biodiversity", "food chain", "population growth", "succession", "biogeochemical"] },
  ],
  Zoology: [
    { chapter: "Structural Organisation in Animals", topic: "Animal Tissues", words: ["epithelial tissue", "connective tissue", "cockroach", "frog"] },
    { chapter: "Animal Kingdom", topic: "Classification", words: ["porifera", "coelenterat", "annelid", "arthropod", "mollusc", "chordat", "notochord"] },
    { chapter: "Digestion and Absorption", topic: "Human Physiology", words: ["digest", "bile", "villi", "pepsin", "trypsin"] },
    { chapter: "Breathing and Exchange of Gases", topic: "Human Physiology", words: ["breathing", "alveoli", "haemoglobin", "tidal volume"] },
    { chapter: "Body Fluids and Circulation", topic: "Human Physiology", words: ["heart", "blood group", "cardiac", "lymph", "sa node"] },
    { chapter: "Excretory Products", topic: "Human Physiology", words: ["nephron", "urine", "kidney", "glomerul"] },
    { chapter: "Locomotion and Movement", topic: "Human Physiology", words: ["muscle contraction", "sarcomere", "joint", "skeleton"] },
    { chapter: "Neural and Chemical Coordination", topic: "Control and Coordination", words: ["neuron", "synapse", "hormone", "pituitary", "thyroid", "insulin"] },
    { chapter: "Human Reproduction", topic: "Reproduction", words: ["spermatogenesis", "oogenesis", "menstrual", "placenta", "gametogenesis"] },
    { chapter: "Human Health and Disease", topic: "Health", words: ["immunity", "antibody", "malaria", "cancer", "vaccine", "aids"] },
    { chapter: "Biotechnology", topic: "Biotechnology", words: ["plasmid", "restriction enzyme", "pcr", "recombinant", "cloning vector"] },
  ],
};

function score(text: string, words: string[]) {
  return words.reduce((acc, w) => (text.includes(w) ? acc + 1 : acc), 0);
}

export function guessSubject(text: string): Subject {
  const t = text.toLowerCase();
  let best: Subject = "Physics";
  let bestScore = -1;
  for (const subject of SUBJECTS) {
    const s = RULES[subject].reduce((acc, r) => acc + score(t, r.words), 0);
    if (s > bestScore) {
      bestScore = s;
      best = subject;
    }
  }
  return best;
}

export function guessChapter(text: string, subject: Subject): { chapter: string; topic: string } {
  const t = text.toLowerCase();
  let best: Rule | null = null;
  let bestScore = 0;
  for (const rule of RULES[subject]) {
    const s = score(t, rule.words);
    if (s > bestScore) {
      bestScore = s;
      best = rule;
    }
  }
  return best ? { chapter: best.chapter, topic: best.topic } : { chapter: "General", topic: subject };
}

/** Heuristic complexity score → Easy / Medium / Hard. */
export function guessDifficulty(text: string): Difficulty {
  const t = text.toLowerCase();
  let points = 0;
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words > 45) points += 1;
  if (words > 80) points += 1;
  if (/[\d.]+\s*[×x*/^]\s*10|√|∫|∑|\bcalculate\b|\bfind the value\b/.test(t)) points += 1;
  if (/\bassertion\b|\breason\b|match the following|statement i|statement-i/.test(t)) points += 2;
  if (/\bwhich of the following is correct\b|\bboth\b.*\band\b/.test(t)) points += 1;
  if (/\bderive\b|\bmechanism\b|\bgraph\b|\bnone of these\b/.test(t)) points += 1;
  if (/\bdefine\b|\bwhich one of the following is\b|\bunit of\b|\bfull form\b/.test(t)) points -= 1;
  if (points <= 0) return "Easy";
  if (points <= 2) return "Medium";
  return "Hard";
}

export function normaliseDifficulty(value: string | null): Difficulty | null {
  return (DIFFICULTIES as readonly string[]).includes(value ?? "") ? (value as Difficulty) : null;
}

export function normaliseSubject(value: string | null): Subject | null {
  return (SUBJECTS as readonly string[]).includes(value ?? "") ? (value as Subject) : null;
}
