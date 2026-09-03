import { productPageLocators } from '../locators/productPageLocators'

export const productPage = {
  getName() {
    return cy.get(productPageLocators.productName)
  },

  // some product titles carry trailing whitespace in the site's own data
  getNameText() {
    return cy.get(productPageLocators.productName).invoke('text').invoke('trim')
  },

  getPrice() {
    return cy.get(productPageLocators.productPrice)
  },

  addToCart() {
    cy.intercept('POST', '**/addtocart').as('addToCart')
    cy.get(productPageLocators.addToCartButton).click()
    cy.wait('@addToCart')
  },
}
