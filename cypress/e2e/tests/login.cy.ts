import { navBar } from '../pageObjects/navBar'
import { loginForm } from '../pageObjects/loginForm'
import { navBarLocators } from '../locators/navBarLocators'
import { validUser } from '../testData/users'

describe('login', () => {
  const { username: USERNAME, password: PASSWORD } = validUser
  const INVALID_USERNAME = 'does-not-exist-user'
  const SOME_PASSWORD = 'somePassword123'

  const ALERTS = {
    userDoesNotExist: 'User does not exist.',
    blankFields: 'Please fill out Username and Password.',
    wrongPassword: 'Wrong password.',
  }

  beforeEach(() => {
    cy.visit('/')
  })

  it('logs in with valid credentials', () => {
    navBar.openLoginModal()

    loginForm.loginSuccessfully(USERNAME, PASSWORD)

    cy.get(navBarLocators.loggedUserName).should('contain.text', USERNAME)
    cy.getLoggedUserEmail().should('eq', USERNAME)
  })

  it(`shows an alert "${ALERTS.userDoesNotExist}" when the user does not exist`, () => {
    cy.interceptAlert()

    navBar.openLoginModal()
    loginForm.login(INVALID_USERNAME, SOME_PASSWORD)

    cy.expectAlert(ALERTS.userDoesNotExist)
    cy.get(navBarLocators.login).should('be.visible')
  })

  it(`shows an alert "${ALERTS.blankFields}" when username and password are blank`, () => {
    cy.interceptAlert()

    navBar.openLoginModal()
    loginForm.submit()

    cy.expectAlert(ALERTS.blankFields)
    cy.get(navBarLocators.login).should('be.visible')
  })

  it(`shows an alert "${ALERTS.wrongPassword}" when the password is wrong`, () => {
    cy.interceptAlert()

    navBar.openLoginModal()
    loginForm.login(USERNAME, SOME_PASSWORD)

    cy.expectAlert(ALERTS.wrongPassword)
    cy.get(navBarLocators.login).should('be.visible')
  })

  // TODO: add tests for username and password fields validation once the shop has this
  // validation implemented.
})
