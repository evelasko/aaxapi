type User {
  id: ID! @id
  name: String
  lastname: String
  email: String! @unique
  emailVerified: Boolean! @default(value: false)
  password: String!
  
  address: Address @relation(link: INLINE name: "UserToAddress")
  phone: PhoneNumber @relation(link: INLINE name: "UserToPhone")
  nID: nID @relation(link: INLINE name: "UserToNationalID")
  updatedAt: DateTime! @updatedAt
  createdAt: DateTime! @createdAt
  socialLinks: [SocialLink] @relation(name: "UserSocialLinks")
  
  notificationsDevice: String
  notificationsPermission: Boolean
  notificationsPrefEmail: Boolean @default(value: true)
  notificationsPrefPush: Boolean @default(value: true)
  notificationsPrefReminderEmail: Boolean @default(value: true)
  notificationsPrefReminderPush: Boolean @default(value: true)
  
  group: UserGroup! @default(value: PUBLIC)
  groupRequest: UserGroup @default(value: PUBLIC)
  
  branch: Branch @relation(name: "BranchToStudent")
  department: Branch @relation(name: "BranchToStaff")
  academicYear: Int @default(value: 0)
  
  isAdmin: Boolean! @default(value: false)
  adminRole: AdminRole @relation(name: "UserToRoles")
  
  newses: [News] @relation(name: "NewsToUser")
  events: [Event] @relation(name: "EventToUser")
}
