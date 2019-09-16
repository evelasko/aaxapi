type AdminRole {
  id: ID! @id
  name: String! @unique
  competences: [AdminCompetence] @relation(name: "RolesToCompetence")
  admins: [User] @relation(name: "UserToRoles")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}

type AdminCompetence {
  id: ID! @id
  name: String! @unique
  description: String
  roles: [AdminRole] @relation(name: "RolesToCompetence")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
}