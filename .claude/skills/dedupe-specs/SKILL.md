---
name: dedupe-specs
description: Find repeated code across Cypress specs, page objects and locators in this suite and propose where each duplicate belongs. Use when asked to clean up, deduplicate, refactor or optimise the tests, when a spec looks copy-pasted, or before adding a variant of an existing test.
---

# Deduplicate the suite

Find repetition, then move each piece to the **lowest layer that owns it**. The
goal is one definition per fact, not the fewest lines.

## Step 1 — find the repetition

```bash
# repeated multi-step flows
grep -rn "cy\.\|Page\.\|cart\.\|loginForm\." cypress/e2e/tests/ | wc -l
# duplicated string literals
grep -rhno "'[^']\{8,\}'" cypress/e2e --include="*.ts" | sort | uniq -c | sort -rn | head -20
# same selector written in more than one place
grep -rn "cy.get('\|cy.contains('" cypress/e2e/tests/
```

Read the specs end to end as well — the worst duplication is a whole `it()` body
copied for a variant (guest vs authorized), which no grep summarises well.

## Step 2 — place each duplicate

| What repeats | Where it belongs |
|---|---|
| A selector string used in a spec | `locators/<page>Locators.ts` — specs should not contain raw selectors |
| A selector built from a parameter | a function in the locators file: `category: (name: Category) => …` |
| A few commands always run together on one page | a page object method (`cart.placeOrder()`) |
| A multi-step flow repeated across `it()` blocks in one spec | a helper inside that `describe` (`buyRandomLaptops()`) |
| A flow or concern used by more than one spec | a custom command in `support/commands.ts` (`cy.interceptAlert()`) |
| A credential or account used by more than one spec | `testData/` |
| An expected string used in both a test title and an assertion | one `const` / object in the spec (`ALERTS`) so the two cannot drift |
| A parsing or formatting step on page text | a page object getter (`getNameText()` trims), never inline in the spec |

Two rules that decide the close calls:

- **Data used by one spec stays in that spec.** `INVALID_USERNAME` lives in
  `login.cy.ts`; centralising it would spread one file's data across two.
- **Parameterise instead of copying** when two tests differ by one value — add an
  argument (`buyRandomLaptops(count)`), not a second copy. If the difference is a
  precondition, keep it in the test (`logIn()` before the helper) so the tests
  still read as distinct scenarios.

## Step 3 — do not over-abstract

Stop when a change would make the test harder to read:

- A two-line block used twice is usually fine as it is.
- Never hide assertions in a helper — they belong in the spec so failures point at
  the test that cared (see the `Avoid` section of `CLAUDE.md`).
- Prefer Cypress built-ins over new helpers: `cy.contains()` + `.closest()`,
  retrying `should()`, `Cypress._` (lodash), `Cypress.sinon.match`.
- A helper that needs a boolean flag to pick between two behaviours is often two
  helpers, or the difference belongs back in the test.

## Step 4 — verify

```bash
npx tsc --noEmit -p tsconfig.json
grep -rn "TODO\|\.only" cypress/
```

Type-check catches imports and keys left behind by the move. Then report what
moved where and what you deliberately left duplicated, and note that the suite
still needs a run — refactoring page objects can change waiting behaviour.
