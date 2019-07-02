import ApolloBoost, { gql } from 'apollo-boost';
import bcrypt from 'bcryptjs';
import 'cross-fetch/polyfill';
import { cacheUsers } from '../src/cache';
import prisma from '../src/prisma';

const client = new ApolloBoost({ uri: 'http://localhost:4000' })

beforeEach(async () => {
    await prisma.mutation.deleteManyNewses()
    await prisma.mutation.deleteManyEvents()
    await prisma.mutation.deleteManyUsers()
    await prisma.mutation.createUser({ data: {
        name: "Jane", email: "ja@email.com", password: bcrypt.hashSync('1234567890')
    }}, '{ id }')
    await cacheUsers()
})

afterAll(async () => {
    await prisma.mutation.deleteManyNewses()
    await prisma.mutation.deleteManyEvents()
    await prisma.mutation.deleteManyUsers()
    await cacheUsers()
})


test('Should sign a user up', async () => {
    const createUser = gql`
        mutation CreateUser ($email: String!, $password: String!, $name: String!) {
            signUpUser( data: { name: $name, email: $email, password: $password } )
            { token error }
        }
    `
    const { data: { signUpUser: { token } } } = await client.mutate({ mutation: createUser, variables: {
      email: 'ronald@example.com',
      password: bcrypt.hashSync('1234567890'),
      name: 'Ronald'
    } } )
    const exists = await prisma.exists.User({ id: token })
    expect(exists).toBe(true)
})
