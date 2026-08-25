#!/usr/bin/env -S npx tsx
import { existsSync } from "node:fs";
import { join } from "node:path";
import { config, setConfig, type Effort } from "../base/config.js";
import { ROOT } from "./paths.js";
import { cmdRun, cmdScore } from "./run.js";
import { cmdDiff, cmdLs, cmdShow, cmdWatch, latestRun } from "./show.js";
import { cmdUnlock } from "./unlock.js";
import { dim } from "./render.js";

// `jam ls | head` closes the pipe early; that is not an error worth a stack
// trace. Exit quietly instead.
process.stdout.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EPIPE") process.exit(0);
  throw e;
});

// Credentials come from .env. Everything else is a flag.
const envFile = join(ROOT, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const argv = process.argv.slice(2);
const cmd = argv[0] ?? "help";

function opt(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  // `jam run --only -v` would otherwise swallow `-v` as the value and silently
  // drop the flag. No flag here takes a negative number, so a leading `-` can
  // only mean the value was left out.
  if (value?.startsWith("-")) throw new Error(`--${name} needs a value`);
  return value;
}
function has(...names: string[]): boolean {
  return names.some((n) => argv.includes(n.length === 1 ? `-${n}` : `--${n}`));
}

// `Number("abc")` is NaN, and NaN spreads silently through config and into the
// harness. Reject anything that is not a whole count up front.
function posInt(name: string, raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`--${name} must be a positive integer (got "${raw}")`);
  }
  return n;
}

/** Config flags, accepted by every command that starts a run. */
function applyConfigFlags(): void {
  const model = opt("model");
  const deep = opt("deep-model");
  const effort = opt("effort");
  const maxTokens = opt("max-tokens");

  if (effort && !["low", "medium", "high"].includes(effort)) {
    throw new Error(`--effort must be low, medium or high (got "${effort}")`);
  }

  setConfig({
    ...(model ? { model } : {}),
    ...(deep ? { deepModel: deep } : {}),
    ...(effort ? { effort: effort as Effort } : {}),
    ...(maxTokens ? { maxTokensPerCall: posInt("max-tokens", maxTokens) } : {}),
  });
}

const HELP = `jam — the harness runner

  jam run [options]              start a run
  jam show [run] [--task NAME]   what happened, per task (--full for everything)
  jam watch [run]                live tail, streaming as it happens
  jam diff [run]                 what the harness changed
  jam score [run]                re-score without re-running
  jam unlock <file>              install the hidden tests handed out at the end
  jam ls                         past runs

run options
  -w, --watch            stream the rendered trace as it happens
  --only <test>          one task, for the inner loop
  --n <count>            cap the number of tasks
  --id <name>            name the run instead of a timestamp
  -v, --verbose          stream the harness's own output

config (defaults in base/config.ts, fixed for the scored run)
  --model <name>         OpenAI model, or the Azure deployment name
  --max-tokens <n>       max_output_tokens per call
  --deep-model <name>    only if you build model routing
  --effort <low|medium|high>   reasoning models only
`;

async function main(): Promise<void> {
  switch (cmd) {
    case "run": {
      applyConfigFlags();
      const id = opt("id") ?? `r${Date.now()}`;
      // Read every flag before the banner, so a bad one fails before we print
      // a header for a run that is not going to start.
      const only = opt("only");
      const n = opt("n") ? posInt("n", opt("n")!) : undefined;
      const c = config();
      console.log("");
      console.log(
        `  ${dim("model".padEnd(10))}${c.model}` +
          (c.effort ? dim(`  ·  effort ${c.effort}`) : ""),
      );
      await cmdRun(id, {
        verbose: has("verbose", "v"),
        watch: has("watch", "w"),
        ...(only ? { only } : {}),
        ...(n ? { n } : {}),
      });
      break;
    }
    case "show": {
      const id = argv[1] && !argv[1].startsWith("-") ? argv[1] : latestRun();
      if (!id) throw new Error("no runs yet");
      cmdShow(id, opt("task"), has("full"));
      break;
    }
    case "watch":
      await cmdWatch(argv[1] && !argv[1].startsWith("-") ? argv[1] : undefined);
      break;
    case "ls":
      cmdLs();
      break;
    case "unlock": {
      const file = argv[1];
      if (!file) throw new Error("usage: jam unlock <file handed out at the end>");
      cmdUnlock(file);
      break;
    }
    case "score": {
      const id = argv[1] && !argv[1].startsWith("-") ? argv[1] : latestRun();
      if (!id) throw new Error("no runs yet");
      await cmdScore(id);
      break;
    }
    case "diff": {
      const id = argv[1] && !argv[1].startsWith("-") ? argv[1] : latestRun();
      if (!id) throw new Error("no runs yet");
      cmdDiff(id);
      break;
    }
    default:
      console.log(HELP);
  }
}

main().catch((e: unknown) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
