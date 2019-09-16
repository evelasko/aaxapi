type News {
  id: ID! @id
  author: User! @relation(name: "NewsToUser")
  title: String!
  subtitle: String
  body: String!
  imageURL: String
  expiration: DateTime
  category: String
  featured: Boolean @default(value: false)
  target: UserGroup!
  deleteUpon: Boolean @default(value: false)
  published: Boolean! @default(value: false)
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type Event {
  id: ID! @id
  author: User! @relation(name: "EventToUser")
  title: String!
  subtitle: String
  organizer: String
  body: String!
  imageURL: String
  date: DateTime!
  access: String
  accessPoint: String
  target: UserGroup!
  deleteUpon: Boolean @default(value: false)
  published: Boolean! @default(value: false)
  venue: Venue! @relation(name: "EventToVenue")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type Venue {
  id: ID! @id
  name: String!
  address: String!
  placeID: String
  latitude: Float
  longitude: Float
  events: [Event] @relation(name: "EventToVenue")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}