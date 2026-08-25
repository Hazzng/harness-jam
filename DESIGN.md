# DESIGN.md

One page. Bullets. No prose. Edit it as you go — do not save it for the end.
It is what you will talk from.

*Below is the harness you were given. Replace each section as you change it.*

## Shape

- One process, one agent, one conversation at a time.

## Prompting

- One system prompt, the same for every task.
- A task arrives as the vitest failure text for one file.

## Tools

- `bash`.

## Decomposition

- One task per test file, in the order vitest reported them.

## State

- The conversation for the current task, discarded afterwards.

## Done

- The model stops calling tools.

## Budget

- Six model turns per task (`MAX_TURNS`), then the task is abandoned.

## Next two hours

- (yours)
