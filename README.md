# harness-jam

You have been given a broken repository, a clock, and a naive agent harness.

The harness is the point. Everyone gets the same bugs, so any difference in
outcome is down to how you built the thing that fixes them.

```bash
./setup.sh
```

Then put an API key in `.env` and:

```bash
jam run --n 1 -w
```

## The job

`problems/minicalc` is a small spreadsheet engine with a failing test suite.
`problems/minicalc/README.md` documents the intended behaviour — where a test and
the spec disagree, the spec is right.

Your job is not to fix the bugs by hand. It is to build a harness that does.

## What is yours

```
harness/main.ts      ← the harness. The loop AND the prompts.
base/exec.ts         plumbing. Change it if you want.
base/suite.ts        plumbing. Change it if you want.
base/tools/          one crude tool. Design better ones.
```

## What is fixed

```
base/model.ts        the model client and the token accounting.
base/trace.ts        the event schema. It is how runs get compared.
base/report.ts       how you tell the scorer what happened.
base/config.ts       FIXED. Model, reasoning effort, max tokens per call.
```

Editing these means your run cannot be compared with anyone else's.

## No steering

Steer all you like while you are building. The run at the end is started and
left alone — no follow-up, no nudge, no answering a question it asks. Design
for that.

## The rules

**Tokens are counted, not capped.** There is no budget to run out of. But
input is roughly seventy times output, because the whole conversation is resent
every turn, and that is what your bill tracks — keeping transcripts short is
worth real money as well as latency.

**No time limit.** A run takes as long as it takes; Ctrl-C stops it and still
scores what it managed. `base/report.ts` writes on every call, so an
interrupted run keeps its results — do not batch yours to the end.

**Tests are restored before scoring.** Anything you do to `tests/` during a run
is discarded. Deleting a failing test earns nothing.

**Extra assertions are added at scoring time** that you never see. A fix that
special-cases the visible test scores zero for that bug. Green is not done.

## Reporting

Your score comes from the test suite, never from `report.json`. What the report
decides is credit for work the suite cannot see:

```json
{ "tasks": [
  { "id": "...", "tests": ["..."], "status": "fixed" },
  { "id": "...", "tests": ["..."], "status": "test_is_wrong",
    "reason": "asserts X; the spec's §N says Y" },
  { "id": "...", "tests": ["..."], "status": "gave_up",
    "reason": "three attempts, no progress, not worth more time" }
]}
```

## The CLI

```bash
jam run --n 1 -w        one task, live trace. This is the inner loop, ~1 min.
jam run --only "<sub>"  one specific failing test
jam run                 everything. Tens of minutes; rarely what you want.

jam show                per-task rollup of the last run: cost, time, how many
                        of the task's tests are green, how many it broke, and
                        what it claimed. Score it first or the last three are —
jam show --task "<sub>" one task in full: what the model said, every command
jam diff                what the harness changed
jam score               re-score a finished or interrupted run
jam ls                  past runs
jam watch               attach to a run already in flight, from another shell
```

Config, overridable per run, with defaults in `base/config.ts`:

```bash
jam run --model gpt-5.6-luna --effort high --max-tokens 16384
# the baseline runs at the lowest reasoning effort
```

## At the end

Keep `DESIGN.md` up to date as you go — it is one page and it is what you will
talk from. Have your trace ready.
