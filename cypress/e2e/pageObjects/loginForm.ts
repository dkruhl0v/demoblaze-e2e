import { loginFormLocators } from '../locators/loginFormLocators'

export const loginForm = {
  login(username: string, password: string) {
    cy.get(loginFormLocators.modal).should('have.css', 'opacity', '1')

    cy.get(loginFormLocators.username)
      .should('be.visible')
      .type(username)
      .should('have.value', username)

    cy.get(loginFormLocators.password)
      .should('be.visible')
      .type(password)
      .should('have.value', password)

    this.submit()
  },

  submit() {
    cy.get(loginFormLocators.modal).should('have.css', 'opacity', '1')
    cy.get(loginFormLocators.loginButton).click()
  },
}
