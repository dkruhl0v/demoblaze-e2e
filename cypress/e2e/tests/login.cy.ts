import { navBar } from '../pageObjects/navBar'
import { loginForm } from '../pageObjects/loginForm'
import { navBarLocators } from '../locators/navBarLocators'
import { loginFormLocators } from '../locators/loginFormLocators'

describe('login', () => {
  const USERNAME = 'd.kruhlov.de@gmail.com'
  const PASSWORD = 'Testpass@123'

  it('logs in with valid credentials', () => {
    cy.visit('/')

    navBar.openLoginModal()
    cy.get(loginFormLocators.modalLabel).should('be.visible')

    loginForm.login(USERNAME, PASSWORD)

    cy.get(navBarLocators.loggedUserName).should('contain.text', USERNAME)
    cy.getLoggedUserEmail().should('eq', USERNAME)
  })
})
