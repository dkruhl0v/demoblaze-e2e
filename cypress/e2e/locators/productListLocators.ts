export type Category = 'phone' | 'notebook' | 'monitor'

export const productListLocators = {
  categoriesTitle: '#cat',
  category: (name: Category) => `[onclick="byCat('${name}')"]`,

  productCard: '.card',
  productCardTitleLink: '.hrefch',
  productCardPrice: 'h5',
}
