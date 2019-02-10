import 'cross-fetch/polyfill'
import prisma from '../src/prisma'
import ApolloBoost, { gql } from 'apollo-boost'
import bcrypt from 'bcryptjs'
import { extractFragmentReplacements } from 'prisma-binding';

const client = new ApolloBoost({ uri: 'http://localhost:4000' })

beforeEach(async () => {
    await prisma.mutation.deleteManyUsers()
    await prisma.mutation.createUser({ data: {
        name: "Jane", email: "j@email.com", password: bcrypt.hashSync('1234567890')
    }}, '{ id }')
})


test('Should sign a user up', async () => {
    const createUser = gql`
        mutation SignUpUser ($email: String!, $password: String!) {
            signUpUser( data: { name: "Ernesto", email: $email, password: $password } )
            { token error }
        }
    `
    const response = await client.mutate({ mutation: createUser, variables: {
      email: 'ernesto@example.com',
      password: bcrypt.hashSync('1234567890'),
    }})
    const exists = await prisma.exists.User({ id: response.data.signUpUser.token })
    expect(exists).toBe(true)
})
