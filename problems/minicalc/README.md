# minicalc

A small spreadsheet engine. Cells hold raw text; formulas start with `=`.

    npm install
    npx vitest run

## Behaviour

The sections below describe how minicalc is meant to behave. They are what the
implementation is written against.

## 1. Cells and literals

A cell holds **raw text**. Its value is derived from that text:

| Raw text | Value |
|---|---|
| `` (empty) | empty — behaves as `0` in arithmetic, ignored by aggregates |
| `=…` | the result of evaluating the formula |
| text parseable as a number (`42`, `-3.5`, `1e3`) | that number |
| `TRUE` / `FALSE` (case-insensitive, exact) | that boolean |
| anything else | that text, verbatim, including surrounding spaces |

Only the raw text is stored. Values are computed, never stored by the caller.

## 2. References and ranges

`A1` style. Columns `A`–`ZZ`, rows `1`–`999999`. A `$` prefix on either part is
accepted and ignored — minicalc has no copy/fill, so absolute and relative
references behave identically.

A **range** is `TOPLEFT:BOTTOMRIGHT`, e.g. `B2:D5`. Ranges are normalised, so
`D5:B2` denotes the same cells as `B2:D5`. Ranges expand row-major.

A range is only valid as a direct argument to a function. `=A1:A3 + 1` is
`#VALUE!`.

A reference to a column beyond `ZZ` or a row beyond `999999` is `#REF!`.

## 3. Errors

Six error values: `#VALUE!`, `#DIV/0!`, `#REF!`, `#CYCLE!`, `#NAME?`, `#N/A`.

Errors **propagate**: any operator or function receiving an error argument
returns that error unchanged. Where more than one argument is an error, the
leftmost wins.

Two functions do not propagate. `IFERROR` inspects the error and substitutes
its fallback. `COUNTA` never looks at values at all — it asks only whether a
cell is empty, so a cell holding an error counts as one more non-empty cell.

Errors are values, not exceptions. Evaluation never throws.

A formula that cannot be parsed is `#VALUE!`. A call to an unknown function is
`#NAME?`.

## 4. Coercion

Two different rules, and the difference matters.

**Scalar contexts** — arithmetic and comparison operators, and the numeric
parameters of scalar functions such as `ROUND`, `ABS`, `POWER`:

- numbers are used as-is
- empty is `0`
- booleans are `1` / `0`
- **text that parses as a number is coerced** (`="7" + 1` is `8`)
- text that does not parse as a number is `#VALUE!`

**Aggregate contexts** — the range arguments of `SUM`, `AVERAGE`, `MIN`, `MAX`,
`COUNT`, `PRODUCT`:

- numbers are included
- **text is ignored, always, including text that looks like a number**
- booleans are ignored
- empty cells are ignored
- errors propagate (an error anywhere in the range is returned)

Comparison operators are a scalar context with one exception: when **both**
operands are text, they compare case-insensitively as text. Otherwise both sides
coerce to numbers.

`COUNT` counts numbers only. `COUNTA` counts every non-empty cell, including
text and booleans.

## 5. Circular references

A cell **participates** in a cycle if it is reachable from itself through
references. A cell **depends on** a cycle if it references, directly or
transitively, a cell that participates in one.

Both cases evaluate to `#CYCLE!`.

`#CYCLE!` is **not** `#REF!`. `#REF!` means a reference that cannot be resolved;
a cycle is made of references that resolve perfectly well.

Cycles are detected when the dependency graph is built, not during evaluation,
so detection does not depend on which cell is read first.

minicalc does not support iterative calculation. There is no convergence, no
iteration limit, and no partial result.

## 6. Recalculation

Evaluation is lazy and cached.

- Setting a cell marks that cell and **all its transitive dependents** dirty.
- Reading a cell evaluates the dirty cells it depends on, in dependency order,
  and caches each result.
- A cached value is reused until something it depends on is set.

Setting a cell to the text it already holds still marks dependents dirty. There
is no equality short-circuit.

## 7. CSV

`fromCSV` fills cells starting at `A1`, row-major, storing each field as raw
text. Fields are not quoted-parsed beyond `"` escaping with doubled quotes.

`toCSV` emits **evaluated values**, not raw text. Errors emit as their error
string. A field containing a comma, quote or newline is quoted, and interior
quotes are doubled.

## 8. Formatting

`format(value, spec)` supports `"0"`, `"0.00"` (any digit count after the
point), `"#,##0"`, and `"0%"`. Rounding for display is half away from zero, the
same rule as `ROUND` (§9).

## 9. Rounding

`ROUND` goes to the nearest value at the requested precision and resolves an
exact half **away from zero**. The rule is symmetric about zero.

Decimal arithmetic a binary float cannot hold exactly still rounds the way the
decimal literal reads.

`ROUNDUP` goes away from zero, `ROUNDDOWN` toward it. All three take an
optional second argument giving decimal places, defaulting to `0`. A negative
place count rounds to tens, hundreds and so on.

`INT` truncates toward negative infinity, so it and `ROUNDDOWN` differ below
zero.

## 10. MOD

`MOD(a, b)` takes the sign of the **divisor**, not the dividend. The result is
therefore never opposite in sign to `b`.

`MOD(a, 0)` is `#DIV/0!`.

## 11. Aggregates and empties

`AVERAGE` of no numbers is `#DIV/0!`. Every other aggregate over no numbers is
`0`.

`AND` and `OR` ignore empty cells and require at least one remaining value;
with none they are `#VALUE!`. A value that is neither boolean, numeric, nor the
text `TRUE`/`FALSE` is `#VALUE!`.

## 12. Text functions

`TRIM` normalises spacing: no leading or trailing spaces, and no run of more
than one space inside.

`LEFT(text, [n])` and `RIGHT(text, [n])` default `n` to `1`. `n` truncates
toward zero before anything else is checked, so a fractional `n` between `-1`
and `0` truncates to `0`, not an error. A negative `n` (after truncation) is
`#VALUE!`; an `n` the string is too short for returns as much as there is.

`CONCAT` joins the text form of every argument. Numbers use their plain
representation, booleans become `TRUE`/`FALSE`, empties contribute nothing.

## 13. VLOOKUP

`VLOOKUP(key, table, colIndex, [exact])`.

`exact` **defaults to TRUE**, which differs from Excel. In exact mode the first
column is scanned in order and the first match wins; text comparison follows
the same rule as the comparison operators in §4. No match is `#N/A`.

In approximate mode the first column is assumed sorted ascending and the last
row not greater than the key is returned; a key below every entry is `#N/A`.

`colIndex` is one-based and counts from the table's first column. Out of range
is `#VALUE!`.
