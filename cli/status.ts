/**
 * The live status line: a spinner and a shimmering label while we wait for
 * the next event. Redrawn in place, cleared before any real output prints.
 */

// Shared with the renderer so the two can never disagree about whether the
// stream is a terminal.
import { useColor } from "./render.js";

// dark -> light -> dark, so the highlight reads as a glint travelling across
// the word. The text itself is the animation; there is no spinner.
const SHIMMER = [238, 240, 243, 246, 250, 253, 250, 246, 243, 240];

function grey(level: number, s: string): string {
  return useColor ? `\u001b[38;5;${level}m${s}\u001b[0m` : s;
}

// Compact elapsed-time display: only the units that matter, no leading
// zeros — 1s, 1m2s, 1h1m1s. Zero itself still reads as "0s".
function formatDuration(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

function shimmer(text: string, tick: number): string {
  if (!useColor) return text;
  const L = SHIMMER.length;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    // Subtracting the tick walks the highlight left to right; adding it would
    // send the glint backwards.
    const level = SHIMMER[(((i - tick) % L) + L) % L] ?? 245;
    out += grey(level, text[i] ?? "");
  }
  return out;
}

export class Status {
  private tick = 0;
  private timer: NodeJS.Timeout | null = null;
  label = "";
  /** Run time at the last sync, and when that sync happened. The clock is
   *  anchored to the run (so attaching mid-run shows the run's age) but keeps
   *  ticking between events instead of freezing until the next one. */
  private baseMs = 0;
  private syncedAt = Date.now();
  private note = "";

  get enabled(): boolean {
    return useColor;
  }

  set(label: string, note = "", elapsedMs?: number): void {
    this.label = label;
    this.note = note;
    if (elapsedMs !== undefined) {
      this.baseMs = elapsedMs;
      this.syncedAt = Date.now();
    }
    if (!this.timer && useColor) {
      this.timer = setInterval(() => this.draw(), 170);
      if (typeof this.timer.unref === "function") this.timer.unref();
    }
  }

  private draw(): void {
    if (!useColor || !this.label) return;
    const secs = Math.floor((this.baseMs + (Date.now() - this.syncedAt)) / 1000);
    const tail = [formatDuration(secs), this.note].filter(Boolean).join("  ");
    const line = `  ${shimmer(this.label, this.tick)}   ${grey(240, tail)}`;
    process.stdout.write(`\r\u001b[2K${line}`);
    this.tick++;
  }

  /** Wipe the status line so real output can be printed cleanly. */
  clear(): void {
    if (useColor) process.stdout.write("\r\u001b[2K");
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.clear();
  }
}
