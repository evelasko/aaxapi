import ApolloBoost, { gql } from 'apollo-boost';
import bcrypt from 'bcryptjs';
import 'cross-fetch/polyfill';
import moment from 'moment';
import prisma from '../src/prisma';

const client = new ApolloBoost({ uri: 'http://localhost:4000' })

beforeEach(async () => {
    await prisma.mutation.deleteManyEvents()
    await prisma.mutation.deleteManyVenues()
    await prisma.mutation.deleteManyUsers()
    const user = await prisma.mutation.createUser({ data: {
        name: "Liam", email: "l@email.com", password: bcrypt.hashSync('1234567890')
    }}, '{ id }')
    const venue = await prisma.mutation.createVenue({ data: {
        "name": "Teatro Tomás y Valiente",
        "address": "28945, Calle de Leganés, 51, 28945 Fuenlabrada, Madrid",
        "placeID": "ChIJP3i1y66LQQ0RpSSEnhN7jJY"
      }}, '{ id }')
    const event = await prisma.mutation.createEvent({data: {
        author: { connect: { id: user.id } },
        venue: { connect: { id: venue.id } },
        title: 'Title of Event',
        body: 'Body of Event',
        date: moment(moment.now()).format(),
        target: 'PUBLIC'
    }}, '{ id }')
})


test ('Venue should exist and have one event', async () => {
    const venues = await prisma.query.venues({},'{id}')
    expect(venues.length).toBe(1)
    const {events} = await prisma.query.venue({where: {id: venues[0].id}}, '{events {id}}')
    expect(events).toBeDefined()
})

test ('Should not delete a venue with events connected', async () => {
    const venues = await prisma.query.venues({},'{id}')
    const deleteVenue = gql` mutation DeleteVenue ($id: ID!) { deleteVenue ( id: $id ) { token error } } `
    const response = await client.mutate({ mutation: deleteVenue, variables: { id: venues[0].id }})
    expect(response).toBeDefined()   
})
