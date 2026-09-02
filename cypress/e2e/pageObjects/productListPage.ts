import { Category, productListLocators } from '../locators/productListLocators'

export interface PickedProduct {
  title: string
  price: number
}

const readCard = ($card: JQuery<HTMLElement>): PickedProduct => ({
  title: $card.find(productListLocators.productCardTitleLink).text().trim(),
  price: Number($card.find(productListLocators.productCardPrice).text().replace('$', '').trim()),
})

export const productListPage = {
  openCategory(name: Category) {
    cy.intercept('POST', '**/bycat').as('byCategory')
    cy.get(productListLocators.category(name)).click()
    cy.wait('@byCategory')
  },

  getProductCards() {
    return cy.get(productListLocators.productCard)
  },

  pickRandomProducts(count: number) {
    return this.getProductCards().then(($cards) => {
      const indexes = Cypress._.sampleSize(Cypress._.range($cards.length), count)
      const products = indexes.map((index) => readCard($cards.eq(index)))

      cy.log(
        `picked ${count} of ${$cards.length} products: ` +
          products.map((p) => `"${p.title}" ($${p.price})`).join(', ')
      )

      return cy.wrap(products, { log: false })
    })
  },

  pickRandomProduct() {
    return this.pickRandomProducts(1).then((products) => products[0])
  },

  openProduct(title: string) {
    cy.contains(productListLocators.productCardTitleLink, title).click()
  },
}
