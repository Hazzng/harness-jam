import type { Event } from "../base/trace.js";

// Piped or redirected output has isTTY === undefined, so test for `true`
// rather than `!== false` — otherwise escape codes end up inside the file.
// Exported (and imported by status.ts) so the two cannot drift apart.
export const useColor = !process.env["NO_COLOR"] && process.stdout.isTTY === true;
const W = Math.min(process.stdout.columns || 92, 96);

/** Visible width: escape sequences take no columns, so they must not count. */
export function visibleWidth(s: string): number {
  return s.replace(/\u001b\[[0-9;]*m/g, "").length;
}

function paint(code: string, s: string): string {
  return useColor ? `\u001b[${code}m${s}\u001b[0m` : s;
}

export const dim = (s: string): string => paint("2", s);
export const bold = (s: string): string => paint("1", s);
export const cyan = (s: string): string => paint("36", s);
export const green = (s: string): string => paint("32", s);
export const yellow = (s: string): string => paint("33", s);
export const red = (s: string): string => paint("31", s);
export const magenta = (s: string): string => paint("35", s);

// Tools are user-extensible, so colour them by name rather than fixing one.
const TOOL_COLORS = [39, 170, 214, 43, 205, 111, 179, 84];
export function toolColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const code = TOOL_COLORS[h % TOOL_COLORS.length] ?? 39;
  return useColor ? `\u001b[38;5;${code}m${name}\u001b[0m` : name;
}

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

export function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function depthOf(e: Event, parents: Map<string, string>): number {
  let d = 0;
  let cur = e.agent;
  while (cur && parents.get(cur)) {
    cur = parents.get(cur);
    if (++d > 8) break;
  }
  return d;
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.trim().split("\n")) {
    if (para.trim() === "") {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      continue;
    }
    let line = "";
    for (const word of para.trim().split(/\s+/)) {
      if (line === "") line = word;
      else if (line.length + 1 + word.length <= width) line += ` ${word}`;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out;
}

function clipLine(s: string, max: number): string {
  const t = s.replace(/\s*\n\s*/g, " ; ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** A single-string argument is the command itself; nobody reads raw JSON. */
function prettyArgs(json: string): string {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1 && typeof o[keys[0]!] === "string") return o[keys[0]!] as string;
    return keys.map((k) => `${k}=${JSON.stringify(o[k])}`).join(" ");
  } catch {
    return json;
  }
}

export interface RenderOpts {
  /** compact: live tail. task: one task's story. full: hold nothing back. */
  detail?: "compact" | "task" | "full";
  parents: Map<string, string>;
}

// No `reason` limit any more — reasoning is always rendered in full.
const LIMITS = {
  compact: { out: 3, cmd: 1 },
  task: { out: 10, cmd: 4 },
  full: { out: 400, cmd: 40 },
} as const;

// Everything lines up with the rules at column 2. Nothing is indented to
// leave room for a timestamp any more, because there is not one.
const PAD = 2;

export function renderEvent(e: Event, opts: RenderOpts): string[] {
  const detail = opts.detail ?? "compact";
  const lim = LIMITS[detail];
  const nest = "  ".repeat(depthOf(e, opts.parents));
  const body = `${" ".repeat(PAD)}${nest}`;
  const bodyW = W - PAD - nest.length - 2;
  const o: string[] = [];

  /** A header line, with its metrics right-aligned and never overlapping. */
  const header = (label: string, metrics = ""): void => {
    const stamp = `  ${nest}`;
    if (!metrics) {
      o.push(`${stamp}${label}`);
      return;
    }
    // Callers hand us an already-coloured label, so the gap has to be measured
    // against its visible width or the metrics land a whole escape sequence early.
    const labelW = stamp.length + visibleWidth(label);
    const gap = W - labelW - metrics.length - 2;
    if (gap >= 2) o.push(`${stamp}${label}${" ".repeat(gap)}${dim(metrics)}`);
    else {
      o.push(`${stamp}${label}`);
      o.push(`${body}${dim(metrics)}`);
    }
  };

  switch (e.type) {
    case "run_start":
      break;

    case "run_end":
      o.push("", "", `  ${dim("─".repeat(W - 4))}`, `  ${bold("done")}  ${e.summary ?? ""}`, "");
      break;

    case "task_start":
      o.push("", "", `  ${dim("━".repeat(W - 4))}`);
      for (const l of wrap(e.task ?? "", W - 6)) o.push(`  ${bold(l)}`);
      if (e.summary) {
        for (const para of e.summary.split("\n")) {
          for (const l of wrap(para, W - 8)) o.push(`  ${dim(l)}`);
        }
      }
      o.push(`  ${dim("━".repeat(W - 4))}`);
      break;

    case "task_end": {
      // The tick is reserved for a fully green suite.
      const allGreen = !(e.summary ?? "").includes("still fail");
      o.push("");
      header(allGreen ? green(`✓ ${e.summary}`) : yellow(`· ${e.summary ?? "finished"}`));
      break;
    }

    case "note": {
      o.push("");
      o.push(`  ${nest}${dim(e.summary ?? "")}`);
      // The opening context is long; only unfold it when asked for detail.
      if (e.summary === "opening context" && detail !== "compact" && Array.isArray(e.detail)) {
        for (const part of e.detail as { role?: string; content?: string }[]) {
          o.push("", `${body}${cyan(part.role ?? "?")}`);
          for (const l of wrap(part.content ?? "", bodyW)) {
            o.push(l === "" ? "" : `${body}${dim(l)}`);
          }
        }
      }
      break;
    }

    case "agent_start":
      o.push("");
      header(magenta(`spawn ${e.agent ?? ""}`), e.summary ?? "");
      break;

    case "agent_end":
      header(magenta(`join  ${e.agent ?? ""}`), e.summary ?? "");
      break;

    case "model_call": {
      // No header. What the model thought and what it then did is the story;
      // a "MODEL" label and a token count on every turn is furniture.
      // Reasoning is never truncated, at any detail level: a summary cut off
      // at "… 3 more" is exactly where the interesting part tends to start.
      // It stays dim, which is what separates it from the model's own text —
      // it no longer carries a "~" gutter.
      if (e.reasoning) {
        o.push("");
        for (const l of wrap(e.reasoning.replace(/\*\*/g, ""), bodyW)) {
          o.push(l === "" ? "" : `${body}${dim(l)}`);
        }
      }
      if (e.text) {
        o.push("");
        for (const l of wrap(e.text, bodyW)) o.push(l === "" ? "" : `${body}${l}`);
      }
      break;
    }

    case "tool_call": {
      const tb = body;
      const tw = bodyW;
      o.push("");
      const failed = /exit [1-9]/.test(e.summary ?? "") || /error/i.test(e.summary ?? "");
      const msMatch = /(\d+)ms/.exec(e.summary ?? "");
      const took = msMatch ? `${(Number(msMatch[1]) / 1000).toFixed(1)}s` : "";
      const mark = `${failed ? red("✗") : green("✓")} ${dim(took)}`;
      const markW = 2 + took.length;

      const calls = e.calls ?? [{ name: e.name ?? "tool", args: "" }];
      for (const call of calls) {
        const label = call.name.padEnd(6);
        const w = tw - markW - label.length - 3;
        const cmd = prettyArgs(call.args);
        const lines = lim.cmd === 1 ? [clipLine(cmd, w)] : wrap(cmd, w);
        const first = lines[0] ?? "";
        const gap = Math.max(1, tw - label.length - first.length - markW - 2);
        o.push(`${tb}${toolColor(label)} ${first}${" ".repeat(gap)}${mark}`);
        for (const l of lines.slice(1, lim.cmd)) o.push(`${tb}${" ".repeat(7)}${dim(l)}`);
      }
      if (e.result) {
        const lines = e.result.trim().split("\n");
        for (const l of lines.slice(0, lim.out)) {
          o.push(`${tb}${dim("│")} ${dim(clipLine(l, tw - 2))}`);
        }
        if (lines.length > lim.out) {
          o.push(`${tb}${dim("│")} ${dim(`… ${lines.length - lim.out} more lines`)}`);
        }
      }
      break;
    }

    default:
      o.push("");
      header(dim(e.type), e.summary ?? "");
  }
  return o;
}
