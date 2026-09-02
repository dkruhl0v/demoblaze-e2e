import { Category, productListLocators } from '../locators/productListLocators'

export interface PickedProduct {
  title: string
  price: number
}

export const productListPage = {
  openCategory(name: Category) {
    cy.intercept('POST', '**/bycat').as('byCategory')
    cy.get(productListLocators.category(name)).click()
    cy.wait('@byCategory')
  },

  getProductCards() {
    return cy.get(productListLocators.productCard)
  },

  pickRandomProduct() {
    return this.getProductCards().then(($cards) => {
      const index = Math.floor(Math.random() * $cards.length)
      const $card = $cards.eq(index)

      const title = $card.find(productListLocators.productCardTitleLink).text().trim()
      const price = Number(
        $card.find(productListLocators.productCardPrice).text().replace('$', '').trim()
      )

      cy.log(`picked product ${index + 1} of ${$cards.length}: "${title}" ($${price})`)

      return cy.wrap({ title, price } as PickedProduct, { log: false })
    })
  },

  openProduct(title: string) {
    cy.contains(productListLocators.productCardTitleLink, title).click()
  },
}
