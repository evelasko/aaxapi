type Program {
  id: ID! @id
  name: String!
  branches: [Branch] @relation(name: "ProgramToBranches")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type Branch {
  id: ID! @id
  name: String! @unique
  shortName: String!
  description: String
  program: Program! @relation(name: "ProgramToBranches")
  students: [User] @relation(name: "BranchToStudent")
  staff: [User] @relation(name: "BranchToStaff")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}