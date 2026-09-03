# CLAUDE.md

Cypress + TypeScript E2E suite for https://www.demoblaze.com.
`baseUrl` is set in `cypress.config.ts`; tests run against the
live site, so its data and API latency are outside our control.

## Commands

```bash
npx cypress open                                  # interactive runner
npx cypress run                                   # headless, whole suite
npx cypress run --spec "cypress/e2e/tests/login.cy.ts"
npx tsc --noEmit -p tsconfig.json                 # type-check, no test run
```

## Architecture

Four layers, each with one job. Keep them separate — most of the mess in a suite
comes from a layer doing another layer's work.

```
cypress/e2e/locators/     selector strings only
cypress/e2e/pageObjects/  actions and element getters built on locators
cypress/e2e/testData/     shared test data (credentials, etc.)
cypress/e2e/tests/        specs: the flow plus all assertions
cypress/support/commands.ts  custom cy.* commands for cross-page concerns
```

### Locators (`*Locators.ts`)

Selector strings, nothing else. No `cy.*` calls, no assertions.

One file per page or component (`navBarLocators`, `loginFormLocators`,
`productListLocators`, `productPageLocators`, `cartLocators`). Prefer one locators
file per page object rather than several feeding one.

Functions are fine here as long as they only build a selector:

```ts
export type Category = 'phone' | 'notebook' | 'monitor'

export const productListLocators = {
  category: (name: Category) => `[onclick="byCat('${name}')"]`,
}
```

Union types over bare `string` for known value sets — a typo becomes a compile
error instead of a mystery "element not found".

### Page objects (`pageObjects/*.ts`)

Plain exported objects with methods. Two kinds of member:

- **Actions** — `openLoginModal()`, `login()`, `addToCart()`, `placeOrder()`.
  These may contain `should()` calls used as *readiness gates* (see Waiting).
- **Getters** — return a chainable for the test to assert on, e.g.
  `getTotalPrice()` returns the element; `getNameText()` returns trimmed text.

Page objects may import other page objects (`cart.open()` uses `navBar.openCart()`).

### Tests (`tests/*.cy.ts`)

One spec per feature: `login.cy.ts`, `purchase.cy.ts`. Multiple
scenarios live as separate `it()` blocks in one `describe`; don't split a feature
across files until a spec gets unwieldy.

All assertions live here. Shared per-spec setup goes in `beforeEach`, and repeated
multi-step flows go in a local helper inside the `describe` (see
`buyRandomLaptops()` in `purchase.cy.ts`) rather than being copy-pasted between
`it()` blocks.

Define expected strings once and reuse them in both the test title and the
assertion, so the two can't drift:

```ts
const ALERTS = { wrongPassword: 'Wrong password.' }

it(`shows an alert "${ALERTS.wrongPassword}" when the password is wrong`, () => {
```

## Selector priority

1. **`id`** — `#login2`, `#totalp`. Stable and cheapest.
2. **A behavioural attribute** — `[onclick^="addToCart"]`, `[data-target="#orderModal"]`.
   Tied to what the element does, not how it looks. Use `^=` when the value
   carries a parameter (`addToCart(9)`), exact `=` when it doesn't (`purchaseOrder()`).
3. **A meaningful class** — `.hrefch`, `.sweet-alert .confirm`. Scope generic
   classes to a container (`#tbodyid .name`) so they can't match elsewhere.
4. **Visible text** — `cy.contains(locator, productTitle)`. Best for picking one
   row or card out of many, and it reads well in the test.
5. **Structural position** — `td:nth-child(3)`. Last resort, for cells with no
   attributes at all. Always name it in the locators file, never inline in a test.

Avoid where possible: styling classes (`.btn-success`), and URL ids such as
`prod.html?idp_=9` — a database id says nothing about which product it is and
silently points elsewhere if the data changes. Find rows/cards by product name and
walk up with `.closest()` instead.

Note this site reuses ids illegally (`#tbodyid`, `#itemc`, `#article` appear on
several elements/pages), so an id is not automatically unique — check before
relying on one.

## Waiting

**Wait on a signal, never on a duration.** The pattern that works here: wait for
the request the *new* page makes.

| Action | Waits on |
|---|---|
| `productListPage.openCategory()` | `POST /bycat` |
| `navBar.openHome()` | `GET /entries` |
| `cart.open()` / `cart.clear()` | `POST /viewcart` |
| `cart.confirmOrder()` | `GET /entries` + popup gone |
| `loginForm.loginSuccessfully()` | `GET /entries` (login reloads the page) |

```ts
cy.intercept('POST', '**/bycat').as('byCategory')
cy.get(productListLocators.category(name)).click()
cy.wait('@byCategory')
```

Two rules that came out of real failures:

- **Give every alias a unique name.** Two methods aliasing `GET /entries` as
  `homeEntries` meant one method's `cy.wait` consumed the other's request and
  returned immediately, against the old page. Hence `homeEntries`,
  `homeAfterLogin`, `homeAfterPurchase`.
- **"Visible" is not "ready".** Elements here are clickable well before they
  work: a Bootstrap modal needs `should('have.css', 'opacity', '1')` (its `show`
  class lands at the *start* of the fade), and SweetAlert ignores clicks until it
  adds `visible` on a 500ms timer. Find the real readiness signal.

## Native dialogs

`window.alert` is not in the DOM and can't be clicked. Stub it and assert on the
stub, via the custom commands in `support/commands.ts`:

```ts
cy.interceptAlert()          // before the action
productPage.addToCart()
cy.expectAlert('Product added')
```

`cy.on('window:alert', cb)` is **not** good enough: the callback only runs if the
alert happens to fire before the test ends, so a wrong expected message can pass
silently. The stub + retrying `should('have.been.calledWith', ...)` actually waits
for the call and fails if it never comes.

`expectAlert` matches on a substring (`Cypress.sinon.match`), because the site is
inconsistent about trailing dots. SweetAlert popups are real DOM — assert on those
normally, no stub.

## Site quirks worth knowing

- **Dirty data**: some product titles carry a trailing newline (`"Sony vaio i7\n"`).
  Compare trimmed text, or use `cy.contains()`, which trims.
- **Inconsistent messages**: add-to-cart says `"Product added."` when logged in and
  `"Product added"` as a guest.
- **Three price formats** for the same number: `"$790 *includes tax"` (product
  page), `"790"` (cart), `"Total: 790"` (order modal).
- **Server-side cart**: the logged-in account's cart survives between runs, so a
  run that fails mid-purchase leaves products behind. `logIn()` calls
  `cart.clear()` for this reason. Guest carts are cookie-keyed, so Cypress's
  per-test cookie clearing handles them.
- **Rendering lags the data**: the cart renders a row only after a follow-up
  `POST /view` per item, so never decide "the cart is empty" from row count —
  read `Items.length` from the intercepted `/viewcart` response.
- **Successful login reloads the page**; failed login does not. That's why
  `login()` and `loginSuccessfully()` are separate methods.

## Avoid

- **`cy.wait(number)`** — never wait on a duration. `cy.wait('@alias')` is the
  supported form; a bare number is a guess that is either too short (flake) or
  wasted time. Wait for a request alias, an element state, or a readiness class.
- **Verification inside page object methods.** Assertions belong in the spec, so a
  failure points at the test that cared and the page object stays reusable by
  tests with different expectations. Page objects return chainables
  (`getTotalPrice()`, `getNameText()`) for the spec to assert on. `should()` used
  purely as a *readiness gate* before an action (modal `opacity: 1`, SweetAlert
  `visible`, `have.value` after typing) is fine — it makes the action reliable, it
  is not the test's check. `expect()` never appears in a page object.
- **Reimplementing what Cypress already does.** Reach for the built-ins first:
  - retrying `should()` / `.and()` instead of manual polling or re-reading
  - `cy.contains(locator, text)` + `.closest()` instead of index arithmetic over
    a list of rows
  - `cy.intercept` + `cy.wait('@alias')` instead of a bespoke wait loop
  - `Cypress._` (bundled lodash) for `sampleSize`, `sumBy`, `range`
  - `Cypress.sinon.match` for partial argument matching
  - `.invoke('text').invoke('trim')` instead of a `.then()` that breaks retry-ability
- **Breaking Cypress's queue.** Commands are queued, not executed line by line, so:
  - a value captured in `.then()` is only readable inside a later `.then()` — a
    function argument is evaluated at *queue* time, when it is still `undefined`
  - a `.then()` callback either queues `cy` commands or returns a plain value,
    never both — wrap the value in `cy.wrap()` if you need both
- **Duplicating a flow between specs.** Extract a local helper in the `describe`
  (`buyRandomLaptops`), a page object method, or a custom command in
  `support/commands.ts`.
- **Hardcoding values two specs share** — put them in `testData/`.
- **Leaving state behind.** Cypress clears cookies and local storage between tests,
  but anything server-side (this account's cart) persists. Clean it up in setup, not
  at the end of a test — a failed test never reaches its cleanup.

## Conventions

- `// TODO:` for follow-ups (uppercase, colon), `// FIXME:` for something broken,
  `// NOTE:` for context. Greppable via `grep -rn "TODO" cypress/`.
- Comment the *why*, not the *what* — especially for a workaround, since the next
  reader cannot recover the reason from the DOM.
- Remove `.only` before committing; it silently skips the rest of the suite.
- Run `npx tsc --noEmit` after edits — it catches unused imports and bad locator
  keys without a browser run.
- `.history/` (VS Code Local History) is gitignored and must not be committed.

## CI

`.github/workflows/cypress.yml` runs on push and via manual dispatch, recording to
Cypress Cloud across a 2-container matrix.

Known issue: both containers use the same demoblaze account, whose cart lives
server-side, so parallel specs can clobber each other's cart state. Give CI its own
account (or register a user per test) before relying on parallel or scheduled runs.
