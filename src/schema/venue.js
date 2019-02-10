import { getPlaceDetails } from '../utils/google.js'

// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------

export const typeDef = `
    type Venue {
        id: ID!
        name: String!
        address: String
        placeID: String
    }
    input VenueInput {
        name: String!
        address: String
        placeID: String
    }
    input UpdateVenueInput {
      name: String
      address: String
      placeID: String
    }
    extend type Query {
        venues(query: String): [Venue]!
    }
    extend type Mutation {
        createVenue(data: VenueInput! ): Venue!
        deleteVenue(id: ID!): Venue!
        updateVenue(id: ID!, data: UpdateVenueInput!): AuthPayload!
    }
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {
    Venue: {},
    Query: {
        venues(parent, args, { prisma }, info) {
            return prisma.query.venues({where: {name_contains: args.query} }, info)
        }
    },
    Mutation: {
        async createVenue(parent, args, { prisma, request }, info) {
            return prisma.mutation.createVenue({
                data: {
                    name: args.data.name,
                    address: args.data.address,
                    placeID: args.data.placeID
                }
            }, info)
        },
        async deleteVenue(parent, args, { prisma, request }, info) {
            if (!await prisma.exists.Venue({ id: args.id }) ) throw new Error('Venue not found in database...')
            return prisma.mutation.deleteVenue({ where: { id: args.id }}, info)
        },
        async updateVenue(parent, {id, data}, { prisma, request }, info) {
            if ( !await prisma.exists.Venue({ id }) ) throw new Error('Venue not found in database...')
            try {
              const token = prisma.mutation.updateVenue({ where: { id }, data }, '{id}')
              return {token: token.id}
            } catch(error) { return {error: error.message} }
        }
    }
}
