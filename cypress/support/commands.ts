import { navBarLocators } from '../e2e/locators/navBarLocators'

Cypress.Commands.add('getLoggedUserEmail', () => {
  return cy
    .get(navBarLocators.loggedUserName)
    .invoke('text')
    .then((text) => text.replace('Welcome ', '').trim())
})

declare global {
  namespace Cypress {
    interface Chainable {
      getLoggedUserEmail(): Chainable<string>
    }
  }
}
