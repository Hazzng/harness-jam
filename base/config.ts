// ─────────────────────────────────────────────────────────────────────────
//  FIXED FILE — do not edit.
//
//  Everything that is not a credential. Defaults live here; the CLI overrides
//  them per run:
//
//      jam run --model gpt-5.6-luna --effort high --max-tokens 16384
//
//  The scored run is launched with one fixed set of these, the same for every
//  team. Until then they are yours to move while you iterate.
// ─────────────────────────────────────────────────────────────────────────

export type Effort = "low" | "medium" | "high";

export interface Config {
  /** OpenAI model name, or on Azure the deployment name. */
  model: string;
  /** Only used if you build model routing. Falls back to `model`. */
  deepModel: string | null;
  /** Reasoning models only. Left unset, the parameter is not sent at all. */
  effort: Effort | null;
  /**
   * A PROVIDER PARAMETER, not enforcement. Sent as `max_output_tokens` to cap
   * one response. Reasoning tokens count against it, so a low value truncates
   * the answer on a high reasoning effort rather than saving anything.
   */
  maxTokensPerCall: number;

}

export const DEFAULTS: Config = {
  model: "gpt-5.6-luna",
  deepModel: null,
  effort: "low",
  maxTokensPerCall: 16_384,
};

/** Pinned. Not a setting. */
export const AZURE_API_VERSION = "2025-04-01-preview";

/** How the CLI hands config to the harness subprocess. Not a user knob. */
const TRANSPORT = "JAM_CONFIG";

let current: Config = (() => {
  const raw = process.env[TRANSPORT];
  if (!raw) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Config>) };
  } catch {
    return { ...DEFAULTS };
  }
})();

export function config(): Config {
  return current;
}

export function setConfig(patch: Partial<Config>): void {
  current = { ...current, ...patch };
}

export function transportEnv(): Record<string, string> {
  return { [TRANSPORT]: JSON.stringify(current) };
}
