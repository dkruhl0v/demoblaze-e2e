import { navBarLocators } from '../locators/navBarLocators'

export const navBar = {
  openLoginModal() {
    cy.get(navBarLocators.login).click()
  },

  openCart() {
    cy.get(navBarLocators.cart).click()
  },

  openHome() {
    cy.get(navBarLocators.home).click()
  },
}
