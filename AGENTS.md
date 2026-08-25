# harness-jam

A timed challenge repo. The human you are working with has two and a half hours
to build an **agent harness** that repairs a deliberately broken TypeScript
library. Everyone in the room gets the same bugs and the same clock, so what
is being judged is the harness design: its tools, its decomposition, how it
manages state, and how it decides something is actually done.

Your job is to help build that harness. It is **not** to go and fix the bugs
yourself — doing that by hand defeats the exercise. If asked to "fix the
failing tests", check whether they mean *make the harness able to*.

## Setup

```bash
./setup.sh
```

Installs both trees, creates `.env`, links the `jam` CLI, and reports how many
tests are failing. Needs Node 20.6+. An API key must be added to `.env` by
hand — `OPENAI_API_KEY`, or `AZURE_OPENAI_API_KEY` plus `AZURE_OPENAI_ENDPOINT`.

## Commands

```bash
jam run --n 1 -w            one task, live trace. THE INNER LOOP, ~1 minute.
jam run --only "<substr>"   one specific failing test
jam run                     everything (tens of minutes — rarely what you want)
jam show [run]              per-task rollup: turns, tools, tokens in and out,
                            time, how many of the task's tests are green now,
                            how many it BROKE, and what it claimed in
                            report.json. Needs a scored run for the last three.
jam show [run] --task "<s>" one task's full transcript, including what the
                            model said and every command it ran
jam diff [run]              what the harness changed in the workspace
jam ls                      past runs, with score and tokens
jam watch [run]             attach to a run already in flight, from another
                            terminal. `run -w` covers the usual case.
```

Use `./jam` if the global link is unavailable. Never run a bare `jam run` when
iterating — it attempts every failing test and takes tens of minutes.

`-w` renders the trace as it is written. `-v` streams the harness's own stdout
instead, which is for debugging the harness rather than watching the agent.

## Layout

```
harness/main.ts    THE DELIVERABLE. A naive serial loop. Rewrite it.
base/model.ts      FIXED. The model client and the token meter.
base/trace.ts      FIXED. The event schema every run is compared through.
base/report.ts     FIXED. How results are declared to the scorer.
base/config.ts     FIXED. Model, reasoning effort, max tokens per call.
                   Defaults to the lowest reasoning effort. --effort raises it.
base/exec.ts       plumbing. Editable.
base/worktree.ts   isolated checkouts, if you run agents in parallel.
base/suite.ts      plumbing. Runs vitest, parses the JSON report. Editable.
base/tools/bash.ts the only tool. Design better ones.
cli/               the jam CLI. Editable but rarely the right thing to change.
problems/minicalc  the repository under repair. Its README documents the
                   behaviour it is supposed to have.
```

**Do not edit anything marked FIXED.** The trace and report schemas are what
every run is read and compared through, and the model client is what keeps the
accounting honest. If a change seems to require editing one of those files, it
almost certainly wants a different design instead.

## Constraints worth designing around

- **No time limit.** A run goes until it finishes or you interrupt it. Ctrl-C
  stops the harness and still scores what it managed, so `base/report.ts`
  writes on every call — never batch results to the end.
- **Tokens are counted, not capped.** Nothing throws when you spend. Time is
  the only thing you can run out of.
- **`tests/` is restored before scoring.** Editing or deleting a failing test
  achieves nothing.
- **Unseen assertions are added at scoring time.** A fix that special-cases the
  visible test scores zero. A green suite is weak evidence, not proof.
- The workspace is a throwaway copy in `/tmp` with its own git repo. Changes do
  not persist between runs, and `git diff` inside it shows only the agent's own
  work.
- **Input tokens are not metered but they are billed.** A single task costs
  roughly 2.5k output tokens against about 180k input, because the whole
  conversation is resent every turn. Anything that keeps transcripts short —
  narrower tool output, summarising between turns, not re-reading files — is
  worth real money as well as latency.

## What is being judged

The harness. Its prompting, its tools, how it splits the work, what it carries
between tasks, and how it decides something is actually done.

`DESIGN.md` has a section for each of those, describing the harness as given.
Keep it current as you change things — it is a deliverable.

## At the end

Iterating on one task is not the same as running the thing. Before you stop,
do a full unattended run and score it:

```bash
jam run --id final          # every failing test, no --n, no --only
jam show final              # per-task rollup: cost, tests fixed, tests broken
jam score final             # the suite result for that run
```

`jam run` with no filters is what the harness is actually judged on. A design
that has only ever been exercised one task at a time has not been exercised.

At the very end you will be handed a file of additional tests that were never
in your repo. They are the assertions your fixes are measured against:

```bash
jam unlock <the file you are given>
jam score final             # now scored against those too
```

`jam score` re-scores the run you already produced — it does not run your
harness again, so there is nothing to gain by waiting for the file.

## Verifying your changes

```bash
npx tsc --noEmit     # must stay clean
jam run --n 1 -w     # a real end-to-end run, about a minute
jam show --task "<substring of the task>"
```

Read the trace before concluding anything worked. `jam show` reports what the
harness actually did, which is regularly not what it was meant to do.
