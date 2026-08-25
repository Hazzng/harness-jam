import type { Node } from "./parse.js";

/** Every cell a formula reads. Ranges are expanded. */
export function collectRefs(n: Node, out: Set<string> = new Set()): Set<string> {
  switch (n.k) {
    case "ref":
      out.add(n.ref);
      break;
    case "call":
      for (const a of n.args) collectRefs(a, out);
      break;
    case "bin":
      collectRefs(n.l, out);
      collectRefs(n.r, out);
      break;
    case "un":
      collectRefs(n.e, out);
      break;
    default:
      break;
  }
  return out;
}

/**
 * Cells that participate in a reference cycle, plus every cell that depends on
 * one. Semantics §5 — both cases are #CYCLE!.
 *
 * `deps` maps a cell to the cells it reads.
 */
export function cycleSet(deps: Map<string, Set<string>>): Set<string> {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const participants = new Set<string>();
  let counter = 0;

  // Iterative Tarjan: each frame is a node plus how far through its edges we are.
  for (const root of deps.keys()) {
    if (index.has(root)) continue;
    const frames: { node: string; edges: string[]; i: number }[] = [
      { node: root, edges: [...(deps.get(root) ?? [])], i: 0 },
    ];
    index.set(root, counter);
    low.set(root, counter);
    counter++;
    stack.push(root);
    onStack.add(root);

    while (frames.length > 0) {
      const f = frames[frames.length - 1]!;
      if (f.i < f.edges.length) {
        const w = f.edges[f.i]!;
        f.i++;
        if (!index.has(w)) {
          if (!deps.has(w)) continue; // a literal cell cannot be part of a cycle
          index.set(w, counter);
          low.set(w, counter);
          counter++;
          stack.push(w);
          onStack.add(w);
          frames.push({ node: w, edges: [...(deps.get(w) ?? [])], i: 0 });
        } else if (onStack.has(w)) {
          low.set(f.node, Math.min(low.get(f.node)!, index.get(w)!));
        }
        continue;
      }
      frames.pop();
      const parent = frames[frames.length - 1];
      if (parent) {
        low.set(parent.node, Math.min(low.get(parent.node)!, low.get(f.node)!));
      }
      if (low.get(f.node) === index.get(f.node)) {
        const comp: string[] = [];
        for (;;) {
          const w = stack.pop()!;
          onStack.delete(w);
          comp.push(w);
          if (w === f.node) break;
        }
        const selfLoop = comp.length === 1 && deps.get(comp[0]!)?.has(comp[0]!);
        if (comp.length > 1 || selfLoop) for (const c of comp) participants.add(c);
      }
    }
  }

  return participants;
}
