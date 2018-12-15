import 'cross-fetch/polyfill'
import prisma from '../src/prisma'
import ApolloBoost, { gql } from 'apollo-boost'
import bcrypt from 'bcryptjs'
import { extractFragmentReplacements } from 'prisma-binding';

const client = new ApolloBoost({ uri: 'http://localhost:4000' })

beforeEach(async () => {
    await prisma.mutation.deleteManyUsers()
    await prisma.mutation.signUpUser({ data: {
        name: "Jane", email: "j@email.com", password: bcrypt.hashSync('contra12345')
    }})
})


test('Should sign a user up', async () => {
    const createUser = gql`
        mutation {
            signUpUser( data: { 
                name: "Ernesto",
                email: "ernesto@example.com",
                password: "contra12345"
                } ) { token, user { id } }
        }
    `
    const response = await client.mutate({ mutation: createUser })
    const exists = await prisma.exists.User({ id: response.data.signUpUser.user.id })
    expect(exists).toBe(true)
})