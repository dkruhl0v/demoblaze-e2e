import { loginFormLocators } from '../locators/loginFormLocators'

// The modal occasionally drops what was typed while it is still settling, which
// leaves a field empty with no error. Retype instead of failing on the first try.
const fillField = (locator: string, value: string, attemptsLeft = 3) => {
  cy.get(locator).should('be.visible').clear().type(value)

  cy.get(locator).then(($field) => {
    if ($field.val() !== value && attemptsLeft > 1) {
      fillField(locator, value, attemptsLeft - 1)
    }
  })

  cy.get(locator).should('have.value', value)
}

export const loginForm = {
  login(username: string, password: string) {
    cy.get(loginFormLocators.modal).should('have.css', 'opacity', '1')

    fillField(loginFormLocators.username, username)
    fillField(loginFormLocators.password, password)

    this.submit()
  },

  // a successful login reloads the page, so the nav bar only shows the logged in
  // user once the fresh page has loaded. Failed logins do not reload, hence the
  // separate method - waiting here would hang the negative tests.
  loginSuccessfully(username: string, password: string) {
    cy.intercept('GET', '**/entries').as('homeAfterLogin')
    this.login(username, password)
    cy.wait('@homeAfterLogin')
  },

  submit() {
    cy.get(loginFormLocators.modal).should('have.css', 'opacity', '1')
    cy.get(loginFormLocators.loginButton).click()
  },
}
