# demoblaze-e2e

End-to-end tests for [demoblaze.com]
web shop — written with [Cypress](https://www.cypress.io/) and TypeScript.

The tests run against the **live public site**, so no local server or test
database is needed. Nothing needs to be configured beyond installing the project.

---

## 1. Requirements

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18 or newer | includes `npm`; developed on Node 20 |
| Git | any | to clone the repository |

Cypress itself is **not** installed globally — `npm install` pulls it in, along
with its own bundled browser. Nothing else is required.

Check what you have:

```bash
node --version    # e.g. v20.12.1
npm --version     # e.g. 10.5.0
```

If `node` is not found, install it from [nodejs.org](https://nodejs.org/) (the LTS
build) and reopen your terminal.

## 2. Setup

```bash
git clone https://github.com/dkruhl0v/demoblaze-e2e.git
cd demoblaze-e2e
npm install
```

`npm install` also downloads the Cypress binary (a few hundred MB) into a cache
outside the project, so the first run takes a few minutes. Later installs reuse it.

Verify the install:

```bash
npx cypress verify
```

## 3. Running the tests

### Interactive (recommended the first time)

```bash
npx cypress open
```

A window opens → choose **E2E Testing** → choose a browser → click a spec file to
run it. You see each step execute in a real browser, can click any step to inspect
the page at that moment, and the spec re-runs automatically when you edit it.

### Headless (terminal only, as CI runs it)

```bash
npx cypress run                                          # whole suite
npx cypress run --spec "cypress/e2e/tests/login.cy.ts"   # one spec
npx cypress run --browser chrome                         # a different browser
```

Results print in the terminal. Videos land in `cypress/videos/`, screenshots of
failures in `cypress/screenshots/` (both git-ignored).

### Type-check without running anything

```bash
npx tsc --noEmit -p tsconfig.json
```

### Test account

The tests log in with a demo account defined in
[`cypress/e2e/testData/users.ts`](cypress/e2e/testData/users.ts). It is a
throwaway account on a public practice site, so it is committed deliberately —
see [Known issues and notes](#6-known-issues-found-in-the-application). Register
your own on the site and change that one file if you prefer.

### If Cypress will not start

```bash
npx cypress install --force   # re-download a corrupted binary
npx cypress cache path        # where the binary lives
```

## 4. What is covered, and why

The suite targets the **critical path of a web shop** — the flows where a failure
costs the business money or blocks the user entirely — rather than exhaustive UI
coverage.

| Spec | Scenarios |
|---|---|
| [`home.cy.ts`](cypress/e2e/tests/home.cy.ts) | home page loads |
| [`login.cy.ts`](cypress/e2e/tests/login.cy.ts) | valid login; non-existent user; blank fields; wrong password |
| [`purchase.cy.ts`](cypress/e2e/tests/purchase.cy.ts) | full purchase as a logged-in user; full purchase as a guest; two different products in one order; order attempted with empty fields |

Why these:

- **Purchase is the revenue path.** It is also the longest chain of dependencies —
  catalogue → product page → cart → order → confirmation — so one test covers the
  most integration surface. It verifies the *same values* across every step: the
  price shown in the listing must match the product page, the cart row, the cart
  total, the order modal total and the amount on the confirmation. That is what
  catches real bugs.
- **Login gates everything else**, and its failure modes are the ones users hit
  daily, so all three negative cases are covered, not just the happy path.
- **Guest vs authorized checkout** are separate code paths on this site (different
  API payloads and, as it turns out, different messages), so both are tested.
- **Two products in one order** exercises cart accumulation and total arithmetic,
  which a single-item test cannot.
- **Empty order fields** documents the validation that actually exists — which
  turned out to be less than the form implies (see issues below).

Deliberately out of scope: sign-up, the contact/about modals, the video player,
pagination, and visual or responsive checks — all low risk relative to the effort.

## 5. How the tests are designed, and why

Full conventions live in [`CLAUDE.md`](CLAUDE.md). The essentials:

**Four layers, each with one job**

```
cypress/e2e/locators/     selector strings only, no Cypress calls
cypress/e2e/pageObjects/  actions and getters built on those locators
cypress/e2e/testData/     shared data (credentials)
cypress/e2e/tests/        the flow and all assertions
cypress/support/          custom cy.* commands for cross-page concerns
```

A markup change is then a one-line edit in one locators file, and a spec reads as
the user's journey rather than a wall of selectors.

**Assertions stay in the specs.** Page objects perform actions and return
chainables (`cart.getTotalPrice()`); they never assert an outcome. This keeps a
page object reusable by tests with different expectations, and makes a failure
point at the test that cared.

**Selector priority:** `id` → behavioural attribute (`[onclick^="addToCart"]`) →
meaningful class → visible text → structural position (`td:nth-child(3)`) as a last
resort. Product rows and cards are found by **product name**, never by the
database id in the URL (`prod.html?idp_=9`).

**No fixed waits anywhere.** `cy.wait(500)` is either too short or wasted time.
Instead each navigation waits for the request the *new* page makes — for example
`POST /bycat` after choosing a category, `POST /viewcart` when opening the cart —
and interactions wait for the element's real readiness signal, which on this site
is often later than "visible". Everything else relies on Cypress's built-in
retrying assertions.

**Randomised where it adds value:** each run picks random products from the
Laptops category and generates random order details, so the tests are not tied to
one hardcoded product. The chosen product is written to the command log so a
failure is still reproducible.

**State is cleaned in setup, not teardown.** The logged-in account's cart lives on
the server and survives between runs, so a run that fails mid-purchase leaves
products behind. Logging in therefore empties the cart first — a failing test
never reaches its own cleanup. Avoided clean ups after tests, since in case of failing,
the clean up might never been reached.

## 6. Known issues found in the application

Found while writing the tests. None are caused by the tests themselves.

| # | Issue | Detail |
|---|---|---|
| 1 | **Confirmation date is off by one month** | The popup builds the date with `date.getMonth()`, which is zero-based — a purchase on 2 September shows `2/8/2026`. |
| 2 | **Order form validates only 2 of 6 fields** | Country, City, Month and Year are accepted empty (and any format), though the form presents them as required. The biggest risk is credit card fields' lack of validation. |
| 3 | **User name field validation missed** | Any format can be used for user name value. Potential for various injections. |
| 4 | **Inconsistent add-to-cart message** | `"Product added."` when logged in, `"Product added"` (no trailing dot) as a guest — same action, two strings. |
| 5 | **Dirty product data** | Some titles contain a trailing newline, e.g. `"Sony vaio i7\n"`, which surfaces in the cart and product page. |
| 6 | **Duplicate `id` attributes** | `#itemc` on all three category links, `#article` on every product card, `#tbodyid` reused across pages. Invalid HTML and hostile to automation. |
| 7 | **Confirmation popup ignores clicks for 500ms** | The OK button is rendered and looks clickable, but the library only wires up its confirm action half a second later; earlier clicks silently dismiss it instead of completing the redirect. |
| 8 | **No feedback while requests are in flight** | Adding to cart, filtering and ordering give no spinner or disabled state, so a slow response looks like a dead UI. |

## 7. TODO / possible improvements

- [ ] **Register a fresh user per test** via the sign-up API instead of sharing one
      account. This removes the cart cleanup step entirely and makes parallel runs
      safe. Was not implemented since there's no access to api to make a proper
      clean up after test run with removing of the created user.
- [ ] **Log in through the API** (`POST /login` + `cy.session()`) for tests whose
      subject is not the login form — currently every purchase test logs in through
      the UI, which is the slowest part of the run.
- [ ] **Give CI its own account.** The workflow runs two containers against the same
      account, whose cart is server-side, so parallel specs can interfere with each
      other. Same applies before enabling a nightly schedule.
- [ ] Move credentials to `Cypress.env` / GitHub secrets if the account ever guards
      anything real.
- [ ] Extend coverage: sign-up, logout, removing an item from the cart, category
      filter counts, pagination, fields validation.
- [ ] Add `npm` scripts (`npm test`, `npm run test:open`) so the commands are
      discoverable without reading this file.
- [ ] Add tags for tests('@login', '@purchase') to be able to run only needed suit.
      Especially usefull for launching via GitHub action.
- [ ] Investigate the login modal occasionally dropping typed input. Currently
      handled by retyping (`fillField` in `pageObjects/loginForm.ts`); the root
      cause in the page's own DOM handling is not confirmed.

## 8. Continuous integration

[`.github/workflows/cypress.yml`](.github/workflows/cypress.yml) runs the suite on
every push and on demand (**Actions → Cypress Tests → Run workflow**), recording
results to Cypress Cloud across two parallel containers. Recording requires a
`CYPRESS_RECORD_KEY` repository secret; see the caveat in TODO above before
relying on the parallel runs.

## 9. AI involvement

This suite was built with involvements of an AI agent (Claude) as a pair.

**Where the agent helped**

- Preparing the commands to initialise the project (npm setup, Cypress and
  TypeScript).
- Diagnosing flaky runs by reading demoblaze's own JavaScript to find the real
  cause — the Bootstrap fade, SweetAlert's 500ms delay before it accepts a click,
  the page reload after login — instead of masking it with waits.
- Spotting repeated code across the specs and proposing where each duplicate
  belonged.
- Cleaning up of git ignored files from the git side (commit dcf7f7b).
- Writing the documentation (this README, `CLAUDE.md`) and proof-reading it.

**Where only my decisions were involved**

- What to test and why: the scenarios, their steps, and what each one asserts.
- Architecture and conventions — the layer split, what belongs in a locators file
  versus a page object, naming, where shared data lives.
- What locators to use.
- Implementation of most of required functions.
- Implementation of tests.

### Agent configuration in this repository

- **[`CLAUDE.md`](CLAUDE.md)** — the conventions of this suite written for the
  agent to load on every session: the layer rules, selector priority, the waiting
  strategy, the site's quirks, and an explicit "avoid" list (no `cy.wait(number)`,
  no assertions in page objects, reuse Cypress built-ins before writing helpers).
  It works equally well as a contributor guide.
- **[`.claude/skills/`](.claude/skills)** — two small skills (packaged
  instructions the agent loads on demand, by name or when a request matches),
  distilled from the work that recurred most on this project:
  - `flake-triage` — takes a failing run's output and works through the causes
    seen here, including reading the application's source for the real readiness
    signal rather than extending a timeout.
  - `dedupe-specs` — finds repeated code and maps each duplicate to the layer that
    should own it.
