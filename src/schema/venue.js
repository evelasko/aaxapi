import { getPlaceDetails } from '../utils/google';
// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------

export const typeDef = `
    type Venue {
        id: ID!
        name: String!
        address: String
        placeID: String
        latitude: Float
        longitude: Float
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
        deleteVenue(id: ID!): AuthPayload!
        updateVenue(id: ID!, data: UpdateVenueInput!): AuthPayload!
    }
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {
    Query: {
        venues(parent, args, { prisma }, info) {
            return prisma.query.venues({where: {name_contains: args.query} }, info)
        }
    },
    Mutation: {
        async createVenue(parent, {data}, { prisma }, info) {
            if (data.placeID) {
                try {
                    const { geometry: { location: { lat, lng}}} = await getPlaceDetails(data.placeID)
                    data.latitude = lat
                    data.longitude = lng
                } catch(err) { throw new Error(err.message) }
            }
            return prisma.mutation.createVenue({
                data: { ...data }
            }, info)
        },
        async deleteVenue(parent, {id}, { prisma, request }, info) {
            try {

                const res = await prisma.mutation.deleteVenue({ where: { id }}, '{id}')
                return { token: res.id }
            } catch(err) { throw new Error(err.message)}
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
