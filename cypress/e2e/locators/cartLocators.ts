export const cartLocators = {
  cartRows: '#tbodyid tr',
  productTitleCell: 'td:nth-child(2)',
  productPriceCell: 'td:nth-child(3)',
  deleteItemLink: '[onclick^="deleteItem"]',
  totalPrice: '#totalp',
  placeOrderButton: '[data-target="#orderModal"]',

  orderModal: '#orderModal',
  orderModalTotal: '#totalm',
  orderNameInput: '#name',
  orderCountryInput: '#country',
  orderCityInput: '#city',
  orderCardInput: '#card',
  orderMonthInput: '#month',
  orderYearInput: '#year',
  orderErrors: '#errors',
  purchaseButton: '[onclick="purchaseOrder()"]',

  confirmation: '.sweet-alert',
  confirmationTitle: '.sweet-alert h2',
  confirmationDetails: '.sweet-alert .lead',
  confirmationOkButton: '.sweet-alert .confirm',
}
