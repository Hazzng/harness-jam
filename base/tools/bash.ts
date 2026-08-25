import { sh } from "../exec.js";
import { defineTool } from "./index.js";

export const bash = defineTool<{ command?: string }>({
  name: "bash",
  description:
    "Run a bash command in the workspace. Returns stdout, stderr and the exit code.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The command to run." },
    },
    required: ["command"],
    additionalProperties: false,
  },
  summarise: (_args, result) => {
    const m = /^exit (\d+)/.exec(result);
    return m ? `exit ${m[1]}` : "exit 0";
  },
  async run({ command }, ctx) {
    if (!command?.trim()) return "error: empty command";
    const r = await sh(ctx.workspace, command);
    // A clean success is just its output. Anything else says so up front, so
    // neither the model nor the trace wades through boilerplate.
    if (r.code === 0 && !r.stderr) return r.stdout || "(no output)";
    return [
      `exit ${r.code}`,
      r.stdout,
      r.stderr ? `stderr:\n${r.stderr}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  },
});
