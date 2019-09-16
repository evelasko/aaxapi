"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_lib_1 = require("prisma-client-lib");
var typeDefs = require("./prisma-schema").typeDefs;

var models = [
  {
    name: "UserGroup",
    embedded: false
  },
  {
    name: "OfficialDocumentType",
    embedded: false
  },
  {
    name: "User",
    embedded: false
  },
  {
    name: "Role",
    embedded: false
  },
  {
    name: "UserRoles",
    embedded: false
  },
  {
    name: "SocialLink",
    embedded: false
  },
  {
    name: "SocialNetwork",
    embedded: false
  },
  {
    name: "OfficialDocument",
    embedded: false
  },
  {
    name: "Address",
    embedded: false
  },
  {
    name: "DeviceType",
    embedded: false
  },
  {
    name: "Device",
    embedded: false
  },
  {
    name: "AppNodeStatus",
    embedded: false
  },
  {
    name: "News",
    embedded: false
  },
  {
    name: "Event",
    embedded: false
  },
  {
    name: "Venue",
    embedded: false
  },
  {
    name: "Space",
    embedded: false
  },
  {
    name: "Department",
    embedded: false
  },
  {
    name: "Program",
    embedded: false
  },
  {
    name: "Branch",
    embedded: false
  },
  {
    name: "Subject",
    embedded: false
  },
  {
    name: "Lesson",
    embedded: false
  },
  {
    name: "OperatingPeriod",
    embedded: false
  },
  {
    name: "Session",
    embedded: false
  },
  {
    name: "LessonSessions",
    embedded: false
  },
  {
    name: "LessonsTeachers",
    embedded: false
  },
  {
    name: "ProductCategory",
    embedded: false
  },
  {
    name: "Product",
    embedded: false
  },
  {
    name: "Discount",
    embedded: false
  },
  {
    name: "DiscountRequest",
    embedded: false
  },
  {
    name: "TxType",
    embedded: false
  },
  {
    name: "Transaction",
    embedded: false
  },
  {
    name: "Order",
    embedded: false
  },
  {
    name: "Item",
    embedded: false
  }
];
exports.Prisma = prisma_lib_1.makePrismaClientClass({
  typeDefs,
  models,
  endpoint: `${process.env["PRISMA_ENDPOINT"]}`,
  secret: `${process.env["PRISMA_SECRET"]}`
});
exports.prisma = new exports.Prisma();
