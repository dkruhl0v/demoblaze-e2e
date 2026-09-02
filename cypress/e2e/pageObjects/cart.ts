import { cartLocators } from '../locators/cartLocators'
import { navBar } from './navBar'

export interface OrderDetails {
  name: string
  country: string
  city: string
  card: string
  month: string
  year: string
}

export interface ConfirmationDetails {
  id: string
  amount: string
  cardNumber: string
  name: string
  date: string
}

export const cart = {
  open() {
    cy.intercept('POST', '**/viewcart').as('viewCart')
    navBar.openCart()
    cy.wait('@viewCart')
  },

  /**
   * Empties the cart through the UI, so a run that failed mid-purchase cannot
   * leave products behind for the next one. The number of items comes from the
   * /viewcart response rather than the DOM, because a row is only rendered
   * after a follow-up /view request per item.
   */
  clear() {
    cy.intercept('POST', '**/viewcart').as('viewCart')
    cy.intercept('POST', '**/deleteitem').as('deleteItem')
    navBar.openCart()

    const removeRemainingItems = () => {
      cy.wait('@viewCart').then((interception) => {
        const items = interception.response?.body?.Items ?? []

        if (items.length === 0) {
          return
        }

        cy.get(cartLocators.deleteItemLink).first().click()
        cy.wait('@deleteItem')

        // deleting reloads the cart page, which requests the cart again
        removeRemainingItems()
      })
    }

    removeRemainingItems()
  },

  getRows() {
    return cy.get(cartLocators.cartRows)
  },

  getProductRow(title: string) {
    return cy.contains(cartLocators.cartRows, title)
  },

  getProductPrice(title: string) {
    return this.getProductRow(title).find(cartLocators.productPriceCell)
  },

  getTotalPrice() {
    return cy.get(cartLocators.totalPrice)
  },

  placeOrder() {
    cy.get(cartLocators.placeOrderButton).click()
    cy.get(cartLocators.orderModal).should('have.css', 'opacity', '1')
  },

  getOrderModalTotal() {
    return cy.get(cartLocators.orderModalTotal)
  },

  fillOrderForm(details: OrderDetails) {
    const fields: [string, string][] = [
      [cartLocators.orderNameInput, details.name],
      [cartLocators.orderCountryInput, details.country],
      [cartLocators.orderCityInput, details.city],
      [cartLocators.orderCardInput, details.card],
      [cartLocators.orderMonthInput, details.month],
      [cartLocators.orderYearInput, details.year],
    ]

    fields.forEach(([locator, value]) => {
      cy.get(locator).should('be.visible').type(value).should('have.value', value)
    })
  },

  purchase() {
    cy.get(cartLocators.purchaseButton).click()
  },

  getConfirmationDetails() {
    return cy
      .get(cartLocators.confirmationDetails)
      .invoke('html')
      .then((html) => {
        const values: Record<string, string> = {}

        html.split(/<br\s*\/?>/i).forEach((line) => {
          const [key, ...rest] = line.split(':')
          if (key && rest.length) {
            values[key.trim()] = rest.join(':').trim()
          }
        })

        return {
          id: values['Id'],
          amount: values['Amount'],
          cardNumber: values['Card Number'],
          name: values['Name'],
          date: values['Date'],
        } as ConfirmationDetails
      })
  },

  confirmOrder() {
    // SweetAlert only acts once it has added "visible" (on a 500ms timer), and it
    // picks confirm-vs-cancel from the event target's own class. A Cypress click
    // can resolve to a neighbouring element (overlay, loader) and silently cancel
    // the order, so fire a native click to guarantee the button is the target.
    // Confirming redirects to the home page, which is a full page load. Wait for
    // the feed that page requests, then for the popup to be gone with the old
    // document - nothing else can be clicked until the new page is up.
    cy.intercept('GET', '**/entries').as('homeAfterPurchase')

    cy.get(cartLocators.confirmation).should('have.class', 'visible')
    cy.get(cartLocators.confirmationOkButton).then(($ok) => {
      $ok[0].click()
    })

    cy.wait('@homeAfterPurchase')
    cy.get(cartLocators.confirmation).should('not.exist')
  },
}
