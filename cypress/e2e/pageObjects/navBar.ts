import { navBarLocators } from '../locators/navBarLocators'

export const navBar = {
  openLoginModal() {
    cy.get(navBarLocators.login).click()
  },

  openCart() {
    cy.get(navBarLocators.cart).click()
  },

  openHome() {
    // the home link is a full page load, so wait for the product feed the new
    // page requests - otherwise the next command runs against the old page
    cy.intercept('GET', '**/entries').as('homeEntries')
    cy.get(navBarLocators.home).click()
    cy.wait('@homeEntries')
  },
}
