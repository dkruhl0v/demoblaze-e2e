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
    cy.get(cartLocators.confirmation).should('have.class', 'visible')
    cy.get(cartLocators.confirmationOkButton).click()
  },
}
