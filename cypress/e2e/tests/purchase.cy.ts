import { navBar } from '../pageObjects/navBar'
import { loginForm } from '../pageObjects/loginForm'
import { productListPage, PickedProduct } from '../pageObjects/productListPage'
import { productPage } from '../pageObjects/productPage'
import { cart, OrderDetails } from '../pageObjects/cart'
import { navBarLocators } from '../locators/navBarLocators'

describe('purchase', () => {
  const USERNAME = 'testcypress@gmail.com'
  const PASSWORD = 'Testpass@123'

  const ALERTS = {
    // logged in user gets "Product added.", a guest "Product added" - the
    // potential product issue to be fixed.
    productAdded: 'Product added',
    emptyOrderFields: 'Please fill out Name and Creditcard.',
  }

  const randomString = () => Math.random().toString(36).slice(2, 8)

  const randomOrder = (): OrderDetails => ({
    name: `name-${randomString()}`,
    country: `country-${randomString()}`,
    city: `city-${randomString()}`,
    card: `${Math.floor(Math.random() * 9000) + 1000}-${randomString()}`,
    month: String(Math.floor(Math.random() * 12) + 1),
    year: String(new Date().getFullYear() + 1),
  })

  const logIn = () => {
    navBar.openLoginModal()
    loginForm.loginSuccessfully(USERNAME, PASSWORD)
    cy.get(navBarLocators.loggedUserName).should('contain.text', USERNAME)

    // this account's cart lives on the server, so a run that failed mid-purchase
    // would leave products behind and break the row and total assertions.
    // would not need if the new user were created within each test run.
    cart.clear()
    navBar.openHome()
  }

  /**
   * Buys `count` different random laptops: adds each one to the cart, orders
   * them, validates the confirmation and checks the cart ends up empty.
   */
  const buyRandomLaptops = (count: number) => {
    const order = randomOrder()
    let products: PickedProduct[]

    productListPage.openCategory('notebook')
    productListPage.pickRandomProducts(count).then((picked) => {
      products = picked
    })

    // add each product to the cart, validating its product page on the way
    cy.then(() => {
      products.forEach((product, index) => {
        // the first product is opened straight from the listing we picked from,
        // the rest need that listing reopened first
        if (index > 0) {
          navBar.openHome()
          productListPage.openCategory('notebook')
        }

        productListPage.openProduct(product.title)
        productPage.getNameText().should('eq', product.title)
        productPage.getPrice().should('contain.text', `$${product.price}`)

        cy.interceptAlert()
        productPage.addToCart()
        cy.expectAlert(ALERTS.productAdded)
      })
    })

    // the cart holds every product at its own price, and the correct total
    cart.open()
    cy.then(() => {
      const total = Cypress._.sumBy(products, 'price')

      cart.getRows().should('have.length', count)
      products.forEach((product) => {
        cart.getProductRow(product.title).should('be.visible')
        cart.getProductPrice(product.title).should('have.text', String(product.price))
      })
      cart.getTotalPrice().should('have.text', String(total))

      cart.placeOrder()
      cart.getOrderModalTotal().should('have.text', `Total: ${total}`)

      cart.fillOrderForm(order)
      cart.purchase()

      cart.getConfirmationDetails().then((confirmation) => {
        expect(confirmation.id).to.match(/^\d+$/)
        expect(confirmation.amount).to.equal(`${total} USD`)
        expect(confirmation.cardNumber).to.equal(order.card)
        expect(confirmation.name).to.equal(order.name)
      })
    })

    // confirming sends the user back to the home page
    cart.confirmOrder()

    cart.open()
    cart.getRows().should('have.length', 0)
  }

  beforeEach(() => {
    cy.visit('/')
  })

  it('buys a random laptop as authorized user', () => {
    logIn()
    buyRandomLaptops(1)
  })

  it('buys a random laptop as guest user', () => {
    buyRandomLaptops(1)
  })

  it('buys two different laptops in one order', () => {
    logIn()
    buyRandomLaptops(2)
  })

  it(`shows an alert "${ALERTS.emptyOrderFields}" when the order fields are empty`, () => {
    cart.open()
    cart.placeOrder()

    cy.interceptAlert()
    cart.purchase()
    cy.expectAlert(ALERTS.emptyOrderFields)
  })

  // TODO: add tests for all mandatory fields validation once the shop has this validation
  // implemented. First priority is credit card fields.
})
