import ApolloBoost, { gql } from 'apollo-boost';
import bcrypt from 'bcryptjs';
import 'cross-fetch/polyfill';
import prisma from '../src/prisma';

const client = new ApolloBoost({ uri: 'http://localhost:4000' })

beforeEach(async () => {
    await prisma.mutation.deleteManyNewses()
    await prisma.mutation.deleteManyEvents()
    await prisma.mutation.deleteManyUsers()
    await prisma.mutation.createUser({ data: {
        name: "Jane", email: "j@email.com", password: bcrypt.hashSync('1234567890')
    }}, '{ id }')
})

test('Should sign a user up', async () => {
    const createUser = gql`
        mutation CreateUser ($email: String!, $password: String!, $name: String!) {
            signUpUser( data: { name: $name, email: $email, password: $password } )
            { token error }
        }
    `
    const response = await client.mutate({ mutation: createUser, variables: {
      email: 'ernesto@example.com',
      password: bcrypt.hashSync('1234567890'),
      name: 'Ronald'
    }})
    const exists = await prisma.exists.User({ id: response.data.signUpUser.token })
    expect(exists).toBe(true)
})
