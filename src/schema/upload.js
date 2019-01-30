import { storeUpload, processUpload } from '../utils/upload'

export const typeDef = `
    scalar Upload

    type File {
       id: ID!
       path: String!
       filename: String!
       mimetype: String!
       encoding: String!
     }

    extend type Query {
      uploads: [File]
    }

    extend type Mutation {
      singleUpload (file: Upload!): File!
      multipleUpload (files: [Upload!]!): [File!]!
    }
`
