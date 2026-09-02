import { navBarLocators } from '../e2e/locators/navBarLocators'

Cypress.Commands.add('getLoggedUserEmail', () => {
  return cy
    .get(navBarLocators.loggedUserName)
    .invoke('text')
    .then((text) => text.replace('Welcome ', '').trim())
})

Cypress.Commands.add('interceptAlert', () => {
  cy.window().then((win) => {
    cy.stub(win, 'alert').as('windowAlert')
  })
})

// Cypress.sinon.match(string) matches on a substring, so callers pass the part of
// the message they care about - the site is not consistent about trailing dots
Cypress.Commands.add('expectAlert', (expectedText: string) => {
  cy.get('@windowAlert').should('have.been.calledWith', Cypress.sinon.match(expectedText))
})

declare global {
  namespace Cypress {
    interface Chainable {
      getLoggedUserEmail(): Chainable<string>
      interceptAlert(): Chainable<void>
      expectAlert(expectedText: string): Chainable<void>
    }
  }
}
