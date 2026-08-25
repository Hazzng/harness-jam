// ─────────────────────────────────────────────────────────────────────────
//  Define tools here. Tracing is automatic.
//
//  A tool defined with `defineTool` and run through `dispatch` appears in the
//  trace with its name, arguments, result and timing, without you writing any
//  of that. `jam show` colours each tool by name, so a fleet of them stays
//  readable — and your architecture is legible to anyone reading the run.
//
//      export const readFile = defineTool({
//        name: "read_file",
//        description: "Read a file, optionally a line range.",
//        parameters: {
//          type: "object",
//          properties: {
//            path:  { type: "string" },
//            start: { type: "number" },
//            end:   { type: "number" },
//          },
//          required: ["path"],
//          additionalProperties: false,
//        },
//        async run({ path, start, end }, ctx) { ... },
//      });
//
//  Then add it to TOOLS below.
// ─────────────────────────────────────────────────────────────────────────

import type { Tool, ToolCall } from "../model.js";
import { clip, emit } from "../trace.js";
import { bash } from "./bash.js";

export interface ToolCtx {
  workspace: string;
  task?: string;
  agent?: string;
}

export interface ToolDef<A = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Return whatever the model should see. Never throw — return the error. */
  run(args: A, ctx: ToolCtx): Promise<string>;
  /**
   * Optional detail for the trace, e.g. "exit 0". Timing is added for you —
   * do not include it here.
   */
  summarise?(args: A, result: string): string;
}

export function defineTool<A>(def: ToolDef<A>): ToolDef<A> {
  return def;
}

/** The tools the harness offers. Add yours here. */
export const TOOLS: ToolDef<never>[] = [bash as unknown as ToolDef<never>];

/** The wire format the model sees. */
export function toolSpecs(defs: ToolDef<never>[] = TOOLS): Tool[] {
  return defs.map((d) => ({
    type: "function" as const,
    name: d.name,
    description: d.description,
    parameters: d.parameters,
  }));
}

/**
 * Runs one tool call and records it. Every tool traced the same way, so
 * nothing you add can quietly disappear from the run.
 */
export async function dispatch(
  call: ToolCall,
  ctx: ToolCtx,
  defs: ToolDef<never>[] = TOOLS,
): Promise<string> {
  const def = defs.find((d) => d.name === call.name);
  const started = Date.now();

  let args: unknown = {};
  let result: string;
  if (!def) {
    result = `error: no such tool "${call.name}"`;
  } else {
    try {
      args = JSON.parse(call.args || "{}");
    } catch {
      args = {};
      result = "";
    }
    try {
      result = await def.run(args as never, ctx);
    } catch (e) {
      result = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  emit({
    type: "tool_call",
    name: call.name,
    task: ctx.task,
    agent: ctx.agent ?? "a0",
    summary: [def?.summarise?.(args as never, result), `${Date.now() - started}ms`]
      .filter(Boolean)
      .join(" · "),
    calls: [{ name: call.name, args: clip(call.args, 2000) }],
    result: clip(result, 4000),
  });

  return result;
}
