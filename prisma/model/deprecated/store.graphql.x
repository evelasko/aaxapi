type ProductCategory {
  id: ID! @id
  name: String!
  products: [Product] @relation(name: "ProductToCategory")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

enum ProductType {
  PRODUCT
  SERVICE
}

type Product {
  id: ID! @id
  name: String!
  unitPrice: Float!
  type: ProductType! @default(value: PRODUCT)
  category: ProductCategory! @relation(name: "ProductToCategory")
  images: [ProductImage] @relation(name: "ProductImages")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type ProductImage {
  id: ID! @id
  title: String! @default(value: "untitled")
  product: Product! @relation(name: "ProductImages")
  imageURL: String!
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type CustomerOrder {
  id: ID! @id
  customer: User! @relation(link: TABLE)
  items: [CustomerOrderItems] @relation(link: TABLE name: "OrderItems")
  invoice: Invoice! @relation(link: INLINE name: "OrderInvoice")
  paymentId: String! @unique
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type CustomerOrderItems {
  id: ID! @id
  order: CustomerOrder! @relation(name: "OrderItems")
  item: Product! @relation(name: "ProductsInOrder")
  quantity: Int!
  orderPrice: Float!
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type Invoice {
  id: ID! @id
  order: CustomerOrder! @relation(name: "OrderInvoice")
  timeDue: DateTime!
  timePaid: DateTime
  vatRate: Int! @default(value: 16)
  netAmount: Float!
  vatAmount: Float!
  grossAmount: Float!
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type Discount {
  id: ID! @id
  email: String!
  total: Float!
  description: String!
  applied: Boolean! @default(value: false)
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}