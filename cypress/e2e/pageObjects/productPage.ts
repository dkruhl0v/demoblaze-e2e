import { productPageLocators } from '../locators/productPageLocators'

export const productPage = {
  getName() {
    return cy.get(productPageLocators.productName)
  },

  getPrice() {
    return cy.get(productPageLocators.productPrice)
  },

  addToCart() {
    cy.get(productPageLocators.addToCartButton).click()
  },
}
