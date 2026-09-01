describe('demoblaze', () => {
  it('loads the home page', () => {
    cy.visit('/')
    cy.contains('PRODUCT STORE').should('be.visible')
  })
})
