---
name: flake-triage
description: Diagnose a failing or flaky Cypress test in this suite. Use when a test fails with a timed-out assertion, an element that "was never found", a field that stayed empty after typing, a click that seemed to do nothing, or a test that passes sometimes and fails other times. Takes the failure output from the runner.
---

# Cypress flake triage

Diagnose the failure before changing anything. Most failures in this suite are
**not** "the app is broken" and **not** "the timeout is too short" — they are the
test acting on an element that is visible but not yet functional, or reading a
value at the wrong moment.

## Step 1 — classify the symptom

Match the failure text against these, in order:

| Symptom | Most likely cause |
|---|---|
| `expected <input> to have value 'x', but the value was ''` | The value was typed then dropped while the modal was still settling. Retype instead of asserting harder (see `fillField` in `pageObjects/loginForm.ts`). |
| `Expected to find element: X, but never found it` | A page load is still in flight and the command ran against the *old* page. The element probably does not exist on the previous page at all. |
| `expected 'http://…/a.html' to include '/b.html'` | `cy.url()` reports the tracked URL, which does not update until the new document finishes loading. |
| A click "did nothing", no error | The element was clickable before its handler was ready, or the event target was not the element the library checks. |
| `expected stub to have been called with …` and the listed call looks almost right | Message mismatch (trailing dot, guest vs logged-in wording), not a missing click. Read the "following calls were made" list carefully. |
| `Too many elements found. Found 'N', expected 'M'` | Leftover server-side state from an earlier failed run. |
| `you are mixing up async and sync code` | A `.then()` callback both queued `cy` commands and returned a plain value. Return `cy.wrap(value)`. |
| A value is `undefined` inside a page object call | It was read at queue time. Only a later `cy.then()` sees values captured by an earlier `.then()`. |

## Step 2 — get the facts, do not guess

- **Read the runner log order.** Events after the failing assert (`(new url) …`,
  `(xhr) …`) mean the thing you waited for happened *late*, not never. That
  distinguishes "wrong signal" from "broken app".
- **Read the site's own JavaScript.** This is the step that resolves most cases:

  ```bash
  curl -s --compressed "https://www.demoblaze.com/js/index.js" | grep -n -A 20 "function logIn"
  ```

  Useful files: `js/index.js` (home, login, categories), `js/prod.js` (product page,
  addToCart), `js/cart.js` (cart, order, purchase),
  `node_modules/bootstrap-sweetalert/dist/sweetalert.js` (confirmation popup).

  Look for: does the handler end in `location.reload()` or `location.href = …`?
  Which XHR does it fire? Does a library gate the handler on a class or timer?
- **Ask the user what the UI did** when the log cannot tell you — e.g. "did the
  popup close or stay open?" Those two answers point at different code branches
  and save a round of speculation.
- Do not add a per-command `timeout` to make a symptom disappear. A longer timeout
  hides the missing signal and slows every run.

## Step 3 — fix with the right signal

Prefer, in this order:

1. **Wait for the request the new page makes** — the established pattern here:

   ```ts
   cy.intercept('POST', '**/bycat').as('byCategory')
   cy.get(locator).click()
   cy.wait('@byCategory')
   ```

   Give the alias a **unique name**. Reusing an alias another method already waits
   on means your `cy.wait` consumes that earlier request and returns immediately
   against the old page.
2. **Wait for the real readiness signal** on the element, not mere visibility:
   Bootstrap modal → `should('have.css', 'opacity', '1')` (the `show` class lands at
   the *start* of the fade); SweetAlert → `should('have.class', 'visible')` (added on
   a 500ms timer, and it ignores clicks until then).
3. **Wait for the old document to be gone** when a redirect must complete:
   `cy.get(popupLocator).should('not.exist')`.
4. **Make the interaction deterministic** when a library inspects the event target:
   `cy.get(sel).then(($el) => { $el[0].click() })` fires a native click so the
   target is unambiguous. Note `{ force: true }` is *not* the same thing and can
   skip the handler entirely.
5. **Read state from the API response** instead of the DOM when rendering lags the
   data (the cart renders a row only after a follow-up `POST /view` per item):

   ```ts
   cy.wait('@viewCart').then((interception) => interception.response?.body?.Items ?? [])
   ```

6. **Clean state in setup, not teardown** — a failed test never reaches its cleanup,
   so leftovers must be cleared before the next run acts (see `cart.clear()`).

## Step 4 — report

State what the log proved, what the site's code does, the fix, and anything still
unverified. If the suite cannot be run here, say so and ask for a re-run rather
than claiming the fix works. Add a comment in the code only where the reason
cannot be recovered from the DOM (library timers, event-target rules).
