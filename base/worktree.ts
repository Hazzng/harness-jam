import { execFileSync } from "node:child_process";
import { existsSync, symlinkSync } from "node:fs";
import { join } from "node:path";

/**
 * An isolated checkout of the workspace, for running agents in parallel.
 *
 * Two agents editing one tree will corrupt each other's work — one writes a
 * file while the other is reading it, and the test run sees a mixture. Give
 * each its own worktree instead; merge the results yourself afterwards.
 *
 *     const tree = addWorktree(workspace, "agent-3");
 *     ...run an agent in `tree`...
 *     const patch = worktreeDiff(tree);   // apply it back if you want it
 *     removeWorktree(workspace, tree);
 *
 * The workspace is a git repo with one commit, made for exactly this.
 */
export function addWorktree(workspace: string, name: string): string {
  const path = join(workspace, "..", `wt-${name}`);
  execFileSync("git", ["worktree", "add", "--detach", "-f", path, "HEAD"], {
    cwd: workspace,
    stdio: "pipe",
  });
  // A worktree has no node_modules of its own; point at the workspace's.
  const mods = join(workspace, "node_modules");
  if (existsSync(mods) && !existsSync(join(path, "node_modules"))) {
    symlinkSync(mods, join(path, "node_modules"), "dir");
  }
  return path;
}

/** Everything the agent changed in its worktree, as a patch. */
export function worktreeDiff(tree: string): string {
  execFileSync("git", ["add", "-A"], { cwd: tree, stdio: "pipe" });
  return execFileSync("git", ["diff", "--cached"], {
    cwd: tree,
    maxBuffer: 32 * 1024 * 1024,
  }).toString();
}

/** Applies a patch produced by worktreeDiff back onto the main workspace. */
export function applyToWorkspace(workspace: string, patch: string): void {
  if (patch.trim() === "") return;
  execFileSync("git", ["apply", "-"], { cwd: workspace, input: patch, stdio: "pipe" });
}

export function removeWorktree(workspace: string, tree: string): void {
  execFileSync("git", ["worktree", "remove", "--force", tree], {
    cwd: workspace,
    stdio: "pipe",
  });
}
