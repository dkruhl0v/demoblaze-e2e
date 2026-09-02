import { navBar } from '../pageObjects/navBar'
import { loginForm } from '../pageObjects/loginForm'
import { productListPage, PickedProduct } from '../pageObjects/productListPage'
import { productPage } from '../pageObjects/productPage'
import { cart, OrderDetails } from '../pageObjects/cart'
import { navBarLocators } from '../locators/navBarLocators'

describe('purchase', () => {
  const USERNAME = 'testcypress@gmail.com'
  const PASSWORD = 'Testpass@123'
  const PRODUCT_ADDED_ALERT = 'Product added.'

  const randomString = () => Math.random().toString(36).slice(2, 8)

  beforeEach(() => {
    cy.visit('/')
  })

  it('buys a random laptop as authorized user and check if the cart is empty after', () => {
    const order: OrderDetails = {
      name: `name-${randomString()}`,
      country: `country-${randomString()}`,
      city: `city-${randomString()}`,
      card: `${Math.floor(Math.random() * 9000) + 1000}-${randomString()}`,
      month: String(Math.floor(Math.random() * 12) + 1),
      year: String(new Date().getFullYear() + 1),
    }

    let product: PickedProduct

    // log in
    navBar.openLoginModal()
    loginForm.login(USERNAME, PASSWORD)
    cy.get(navBarLocators.loggedUserName).should('contain.text', USERNAME)

    // pick a random laptop from the notebooks category
    productListPage.openCategory('notebook')
    productListPage.pickRandomProduct().then((picked) => {
      product = picked
    })

    // open its product page and validate what the list showed
    cy.then(() => {
      productListPage.openProduct(product.title)

      productPage.getName().should('have.text', product.title)
      productPage.getPrice().should('contain.text', `$${product.price}`)
    })

    // add it to the cart
    cy.interceptAlert()
    productPage.addToCart()
    cy.expectAlert(PRODUCT_ADDED_ALERT)

    // the cart holds exactly that product, at that price
    cart.open()
    cy.then(() => {
      cart.getRows().should('have.length', 1)
      cart.getProductRow(product.title).should('be.visible')
      cart.getProductPrice(product.title).should('have.text', String(product.price))
      cart.getTotalPrice().should('have.text', String(product.price))
    })

    // the order modal repeats the same total
    cart.placeOrder()
    cy.then(() => {
      cart.getOrderModalTotal().should('have.text', `Total: ${product.price}`)
    })

    // place the order and validate the confirmation
    cart.fillOrderForm(order)
    cart.purchase()

    cy.then(() => {
      cart.getConfirmationDetails().then((confirmation) => {
        expect(confirmation.id).to.match(/^\d+$/)
        expect(confirmation.amount).to.equal(`${product.price} USD`)
        expect(confirmation.cardNumber).to.equal(order.card)
        expect(confirmation.name).to.equal(order.name)
      })
    })

    // confirming sends the user back to the home page
    cart.confirmOrder()
    cy.url().should('include', '/index.html')

    // and the cart is empty again
    cart.open()
    cart.getRows().should('have.length', 0)
  })

  it('buys a random laptop as guest user and check if the cart is empty after', () => {
    const order: OrderDetails = {
      name: `name-${randomString()}`,
      country: `country-${randomString()}`,
      city: `city-${randomString()}`,
      card: `${Math.floor(Math.random() * 9000) + 1000}-${randomString()}`,
      month: String(Math.floor(Math.random() * 12) + 1),
      year: String(new Date().getFullYear() + 1),
    }

    let product: PickedProduct

    // pick a random laptop from the notebooks category
    productListPage.openCategory('notebook')
    productListPage.pickRandomProduct().then((picked) => {
      product = picked
    })

    // open its product page and validate what the list showed
    cy.then(() => {
      productListPage.openProduct(product.title)

      productPage.getName().should('have.text', product.title)
      productPage.getPrice().should('contain.text', `$${product.price}`)
    })

    // add it to the cart
    cy.interceptAlert()
    productPage.addToCart()
    cy.expectAlert(PRODUCT_ADDED_ALERT)

    // the cart holds exactly that product, at that price
    cart.open()
    cy.then(() => {
      cart.getRows().should('have.length', 1)
      cart.getProductRow(product.title).should('be.visible')
      cart.getProductPrice(product.title).should('have.text', String(product.price))
      cart.getTotalPrice().should('have.text', String(product.price))
    })

    // the order modal repeats the same total
    cart.placeOrder()
    cy.then(() => {
      cart.getOrderModalTotal().should('have.text', `Total: ${product.price}`)
    })

    // place the order and validate the confirmation
    cart.fillOrderForm(order)
    cart.purchase()

    cy.then(() => {
      cart.getConfirmationDetails().then((confirmation) => {
        expect(confirmation.id).to.match(/^\d+$/)
        expect(confirmation.amount).to.equal(`${product.price} USD`)
        expect(confirmation.cardNumber).to.equal(order.card)
        expect(confirmation.name).to.equal(order.name)
      })
    })

    // confirming sends the user back to the home page
    cart.confirmOrder()
    cy.url().should('include', '/index.html')

    // and the cart is empty again
    cart.open()
    cart.getRows().should('have.length', 0)
  })
})
