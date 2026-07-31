import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight math/notation renderer for NEET question text.
 * Handles:
 *  - **bold** and *italic* markers
 *  - superscripts: x^2, x^{-1/2}, x**2, 10^-3
 *  - subscripts: H_2O, H_{2}O, CO2 style chemical digits (A_2 form only)
 *  - common symbol replacements: \times, \pm, ->, <=, >=, deg, alpha…
 */

const SYMBOLS: Array<[RegExp, string]> = [
  [/\\times/g, "×"],
  [/\\cdot/g, "·"],
  [/\\div/g, "÷"],
  [/\\pm/g, "±"],
  [/\\mp/g, "∓"],
  [/\\deg(?:ree)?/g, "°"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\gamma/g, "γ"],
  [/\\delta/g, "δ"],
  [/\\Delta/g, "Δ"],
  [/\\theta/g, "θ"],
  [/\\lambda/g, "λ"],
  [/\\mu/g, "μ"],
  [/\\pi/g, "π"],
  [/\\rho/g, "ρ"],
  [/\\sigma/g, "σ"],
  [/\\omega/g, "ω"],
  [/\\Omega/g, "Ω"],
  [/\\infty/g, "∞"],
  [/\\sqrt/g, "√"],
  [/\\rightarrow|-->|->/g, "→"],
  [/\\leftrightarrow|<->/g, "⇌"],
  [/<=/g, "≤"],
  [/>=/g, "≥"],
  [/!=/g, "≠"],
  [/~=|\\approx/g, "≈"],
];

function normalize(input: string): string {
  let out = input;
  for (const [re, ch] of SYMBOLS) out = out.replace(re, ch);
  // "x**2" → "x^2"
  out = out.replace(/\*\*(?=[-+]?[\dA-Za-z({])/g, "^");
  return out;
}

// matches ^{...} ^2 ^-1/2 ^n  and _{...} _2 _n
const SCRIPT_RE = /([_^])(?:\{([^}]*)\}|([A-Za-z0-9+\-./]+))/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

function renderScripts(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const value = m[2] ?? m[3] ?? "";
    const Tag = m[1] === "^" ? "sup" : "sub";
    nodes.push(
      <Tag key={`${keyBase}-s${m.index}`} className="text-[0.72em] leading-none">
        {value}
      </Tag>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderInline(raw: string, keyBase: string): ReactNode[] {
  const text = normalize(raw);
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  BOLD_RE.lastIndex = 0;
  while ((m = BOLD_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(...renderScripts(text.slice(last, m.index), `${keyBase}-${last}`));
    nodes.push(
      <strong key={`${keyBase}-b${m.index}`} className="font-semibold">
        {renderScripts(m[1], `${keyBase}-b${m.index}i`)}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(...renderScripts(text.slice(last), `${keyBase}-${last}`));
  return nodes;
}

interface MathTextProps {
  children: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "div";
}

export function MathText({ children, className, as = "span" }: MathTextProps) {
  const Tag = as;
  const source = children ?? "";
  const lines = source.split("\n");
  return (
    <Tag className={cn(className)}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderInline(line, `l${i}`)}
        </Fragment>
      ))}
    </Tag>
  );
}
