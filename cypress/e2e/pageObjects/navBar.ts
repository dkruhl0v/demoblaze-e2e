import { navBarLocators } from '../locators/navBarLocators'

export const navBar = {
  openLoginModal() {
    cy.get(navBarLocators.login).click()
  },
}
