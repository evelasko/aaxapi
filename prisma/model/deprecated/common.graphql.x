enum UserGroup {
  PUBLIC
  STAFF
  STUDENT
}
enum nIdType {
  PASSPORT
  NATIONALID
  SOCIALSECURITY
  OTHER
}
type Address {
  id: ID! @id
  line1: String!
  line2: String
  city: String!
  state: String!
  country: String!
  latitude: Float
  longitude: Float
  user: User! @relation(name: "UserToAddress")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type PhoneNumber {
  id: ID! @id
  countryCode: Int!
  phone: Int! @unique
  verified: Boolean! @default(value: false)
  user: User! @relation(name: "UserToPhone")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type nID {
  id: ID! @id
  nID: String! @unique
  sourceType: nIdType!
  verified: Boolean! @default(value: false)
  user: User! @relation(name: "UserToNationalID")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type SocialLink {
  id: ID! @id
  user: User! @relation(name: "UserSocialLinks")
  network: SocialNetwork! @relation(name: "LinkToSocialNetwork")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type SocialNetwork {
  id: ID! @id
  name: String! @unique
  baseURL: String! @unique
  links: [SocialLink] @relation(name: "LinkToSocialNetwork")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}