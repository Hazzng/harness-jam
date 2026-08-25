import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
  truncated: boolean;
}

const MAX_OUTPUT = 4_000;

function clip(s: string): { text: string; cut: boolean } {
  if (s.length <= MAX_OUTPUT) return { text: s, cut: false };
  const head = s.slice(0, MAX_OUTPUT * 0.7);
  const tail = s.slice(-MAX_OUTPUT * 0.3);
  return { text: `${head}\n\n… ${s.length - MAX_OUTPUT} characters elided …\n\n${tail}`, cut: true };
}

/** Runs a shell command inside the workspace. Never throws on a non-zero exit. */
export async function sh(
  workspace: string,
  command: string,
  timeoutMs = 120_000,
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await run("bash", ["-lc", command], {
      cwd: workspace,
      timeout: timeoutMs,
      maxBuffer: 32 * 1024 * 1024,
    });
    const o = clip(stdout);
    const e = clip(stderr);
    return { stdout: o.text, stderr: e.text, code: 0, truncated: o.cut || e.cut };
  } catch (err) {
    const x = err as { stdout?: string; stderr?: string; code?: number; killed?: boolean };
    const o = clip(x.stdout ?? "");
    const e = clip(x.stderr ?? (x.killed ? `timed out after ${timeoutMs}ms` : ""));
    return {
      stdout: o.text,
      stderr: e.text,
      code: typeof x.code === "number" ? x.code : 1,
      truncated: o.cut || e.cut,
    };
  }
}
