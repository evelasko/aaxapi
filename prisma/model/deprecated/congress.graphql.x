enum ParticipationType {
  ATTENDEE
  SPEAKER
}

enum ParticipationStatus {
  PREACTIVE
  ACTIVE
  CANCELED
}

enum ProposalStatus {
  INREVIEW
  APPROVED
  REJECTED
}

type CongressEdition {
  id: ID! @id
  year: Int!
  participants: [Participant] @relation(name: "ParticipantToCongress")
  startDate: DateTime
  endDate: DateTime
  products: [CongressProduct] @relation(name: "ProductsOfCongress")
  committee: [CommitteBoardUser] @relation(name: "CongressCommitteeBoard")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type CongressProduct {
  id: ID! @id
  congress: CongressEdition! @relation(name: "ProductsOfCongress")
  product: Product! @relation(link: TABLE)
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type Participant {
  id: ID! @id
  user: User! @relation(name: "UserAsCongressSpeaker")
  type: ParticipationType!
  participationStatus: ParticipationStatus! @default(value: PREACTIVE)
  congress: CongressEdition! @relation(name: "ParticipantToCongress")
  proposals: [Proposal] @relation(name: "SpeakerToProposal")
  paymentSettled: Boolean! @default(value: false)
  authorized: Boolean! @default(value: false)
  invoiceID: Invoice @relation(link: TABLE)
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type CommitteBoardUser {
  id: ID! @id
  congress: CongressEdition! @relation(name: "CongressCommitteeBoard")
  user: User! @relation(link: TABLE)
  reviews: [ProposalReview] @relation(name: "CommitteeBoardReviews")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type ProposalReview {
  id: ID! @id
  proposal: Proposal! @relation(name: "ProposalReviews")
  committeUser: CommitteBoardUser! @relation(name: "CommitteeBoardReviews")
  status: ProposalStatus! @default(value: INREVIEW)
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type Proposal {
  id: ID! @id
  speakerApplication: Participant! @relation(name: "SpeakerToProposal")
  abstract: String!
  status: ProposalStatus! @default(value: INREVIEW)
  reviews: [ProposalReview] @relation(name: "ProposalReviews")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}