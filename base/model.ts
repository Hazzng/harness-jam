// ─────────────────────────────────────────────────────────────────────────
//  FIXED FILE — do not edit.
//
//  The model client. Nothing here caps anything — tokens are counted so a run
//  can be read and compared afterwards, not to limit you.
//
//      const r = await call(input, tools);                  // fast
//      const r = await call(input, tools, { model: "deep" }); // escalate
//
//  The baseline only ever uses "fast". Escalation to a second model is
//  available if you configure one with --deep-model.
//
//  Built on the Responses API, so reasoning summaries come back as text and
//  land in the trace. Append `result.output` to your input verbatim before
//  adding your function_call_output items — that is what carries reasoning
//  state across turns.
// ─────────────────────────────────────────────────────────────────────────

import OpenAI, { AzureOpenAI } from "openai";
import { AZURE_API_VERSION, config } from "./config.js";
import { clip, emit } from "./trace.js";

export type Role = "fast" | "deep";

/** Anything the Responses API accepts in `input`. */
export type Item =
  | { role: "system" | "user" | "assistant"; content: string }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string }
  | Record<string, unknown>;

export interface Tool {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

let spentOut = 0;
let spentIn = 0;

/** Tasks whose opening context has already been recorded. */
const promptSeen = new Set<string>();

/**
 * Accounting only. Nothing here caps anything. These numbers exist so a run
 * can be compared on efficiency, and so you can see where your tokens went.
 */
export const usage = {
  out: () => spentOut,
  in: () => spentIn,
};

type Wire = { client: OpenAI | AzureOpenAI; model: (r: Role) => string };
let wire: Wire | null = null;

function connect(): Wire {
  if (wire) return wire;
  const cfg = config();

  const azureKey = process.env["AZURE_OPENAI_API_KEY"];
  if (azureKey) {
    // Both spellings are in circulation; accept either.
    const endpoint =
      process.env["AZURE_OPENAI_ENDPOINT"] ?? process.env["AZURE_OPENAI_API_ENDPOINT"];
    if (!endpoint) throw new Error("AZURE_OPENAI_ENDPOINT is not set");
    wire = {
      client: new AzureOpenAI({
        apiKey: azureKey,
        endpoint,
        apiVersion: AZURE_API_VERSION,
      }),
      // On Azure the "model" is the deployment name, so --model covers both.
      model: (r) => (r === "deep" ? (cfg.deepModel ?? cfg.model) : cfg.model),
    };
    return wire;
  }

  const key = process.env["OPENAI_API_KEY"];
  if (!key) {
    throw new Error(
      "no credentials. Set OPENAI_API_KEY, or the AZURE_OPENAI_* block. See .env.example",
    );
  }
  wire = {
    client: new OpenAI({ apiKey: key }),
    model: (r) => (r === "deep" ? (cfg.deepModel ?? cfg.model) : cfg.model),
  };
  return wire;
}

export function provider(): "openai" | "azure" {
  return process.env["AZURE_OPENAI_API_KEY"] ? "azure" : "openai";
}

export interface ToolCall {
  call_id: string;
  name: string;
  args: string;
}

export interface CallResult {
  /** What the model said. */
  text: string;
  /** Its reasoning summary, when the model produced one. */
  reasoning: string;
  toolCalls: ToolCall[];
  /** Append to your input verbatim before your function_call_output items. */
  output: Item[];
  status: string;
}

export interface CallOpts {
  /** Defaults to "fast". "deep" bills at config().deepWeight times the rate. */
  model?: Role;
  task?: string;
  agent?: string;
  parent?: string;
  /** Overrides the configured reasoning effort for this call only. */
  effort?: "low" | "medium" | "high";
}

interface RespShape {
  output?: {
    type?: string;
    summary?: { text?: string }[];
    content?: { type?: string; text?: string }[];
    call_id?: string;
    name?: string;
    arguments?: string;
  }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    output_tokens_details?: { reasoning_tokens?: number };
  };
  status?: string;
}

/** Transient means rate limits, gateway errors and dropped connections. */
function transient(e: unknown): boolean {
  const err = e as { status?: number; code?: string; message?: string };
  if (err.status === 429 || (err.status ?? 0) >= 500) return true;
  const m = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
  return /connection|econnreset|etimedout|socket|network|timeout/.test(m);
}

const RETRIES = 4;

/**
 * A dropped connection is not a design decision, so it is handled here rather
 * than left as a coin flip. Exponential backoff, then give up honestly.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!transient(e) || attempt === RETRIES) break;
      const wait = 1000 * 2 ** attempt;
      emit({
        type: "note",
        summary: `${(e as Error).message?.slice(0, 80)} — retrying in ${wait / 1000}s`,
      });
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

export async function call(
  input: Item[],
  tools: Tool[] = [],
  opts: CallOpts = {},
): Promise<CallResult> {
  const cfg = config();
  // Record what a task was actually told, once, the first time it is asked.
  // What context each unit of work arrives with is part of what a harness is
  // judged on, so it is captured here rather than left to the harness.
  const key = opts.task ?? "(no task)";
  if (!promptSeen.has(key)) {
    promptSeen.add(key);
    emit({
      type: "note",
      task: opts.task,
      agent: opts.agent ?? "a0",
      summary: "opening context",
      detail: input.map((i) => {
        const r = i as { role?: string; content?: string };
        return r.role ? { role: r.role, content: clip(r.content ?? "", 6000) } : i;
      }),
    });
  }

  const role: Role = opts.model ?? "fast";
  const { client, model: resolve } = connect();
  const model = resolve(role);
  const effort = opts.effort ?? cfg.effort;
  const started = Date.now();

  const res = (await withRetry(() =>
    client.responses.create({
    model,
    input: input as never,
    ...(tools.length > 0 ? { tools: tools as never } : {}),
    max_output_tokens: cfg.maxTokensPerCall,
    // A summary is what makes the trace readable. Ask for one whenever the
    // model is capable of reasoning at all.
    ...(effort ? { reasoning: { effort, summary: "auto" } } : { reasoning: { summary: "auto" } }),
      store: false,
    } as never),
  )) as unknown as RespShape;

  const items = res.output ?? [];
  const reasoning = items
    .filter((i) => i.type === "reasoning")
    .flatMap((i) => (i.summary ?? []).map((sm) => sm.text ?? ""))
    .filter(Boolean)
    .join("\n\n");
  const text = items
    .filter((i) => i.type === "message")
    .flatMap((i) => (i.content ?? []).map((c) => c.text ?? ""))
    .filter(Boolean)
    .join("\n");
  const toolCalls: ToolCall[] = items
    .filter((i) => i.type === "function_call")
    .map((i) => ({
      call_id: i.call_id ?? "",
      name: i.name ?? "",
      args: i.arguments ?? "{}",
    }));

  const u = res.usage;
  spentIn += u?.input_tokens ?? 0;
  spentOut += u?.output_tokens ?? 0;
  const reasoningTokens = u?.output_tokens_details?.reasoning_tokens;

  emit({
    type: "model_call",
    name: `${role}:${model}`,
    task: opts.task,
    agent: opts.agent ?? "a0",
    parent: opts.parent,
    tokens_in: u?.input_tokens ?? 0,
    tokens_out: u?.output_tokens ?? 0,
    summary:
      `${Date.now() - started}ms` +
      (res.status === "incomplete" ? " — TRUNCATED, raise maxTokensPerCall" : ""),
    ...(text ? { text: clip(text, 8000) } : {}),
    ...(reasoning ? { reasoning: clip(reasoning, 8000) } : {}),
    ...(reasoningTokens ? { reasoning_tokens: reasoningTokens } : {}),
    ...(toolCalls.length > 0
      ? { calls: toolCalls.map((t) => ({ name: t.name, args: clip(t.args, 2000) })) }
      : {}),
  });

  return {
    text,
    reasoning,
    toolCalls,
    output: items as Item[],
    status: res.status ?? "unknown",
  };
}
