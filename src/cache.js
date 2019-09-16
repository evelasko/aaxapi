import { redis } from './server';
import prisma from './prisma'
import { usersCacheKey, eventsCacheKey, newsesCacheKey } from './constants'

const queryCacheUsers = `{
    id email password firstname lastname isAdmin emailVerified groupRequest group
    devices { notificationsDevice notificationsPermission }
}`
const queryCacheEvents = `{
    id title subtitle imageURL date target status author { id }
}`

const queryCacheNewses = `{
    id title subtitle body imageURL featured expiration target status author { id }
}`

// -------------------------- READ CACHE
export const getCachedData = async (key) => {
    const response = await redis.lrange(key, 0, -1) || []
    return response.map(item => JSON.parse(item))
}

// -------------------------- CACHE USERS
export const cacheUsers = async () => {
    await redis.del(usersCacheKey) // CLEAR CACHE
    const rows = await prisma.query.users({}, queryCacheUsers) // RETRIEVE ALL USERS
    if (!rows.length) return null
    const res = await redis.lpush(usersCacheKey, ...rows.map(r => JSON.stringify(r)))
    console.log('Response from cacheUsers: ', res)
    return rows
}

// -------------------------- CACHE EVENTS
export const cacheEvents = async () => {
    await redis.del(eventsCacheKey) // CLEAR CACHE
    const rows = await prisma.query.events({}, queryCacheEvents) // RETRIEVE ALL EVENTS
    if (!rows.length) return null
    const res = await redis.lpush(eventsCacheKey, ...rows.map(r => JSON.stringify(r)))
    console.log('Response from cacheEvents: ', res)
    return rows
}

// -------------------------- CACHE NEWSES
export const cacheNews = async () => {
    await redis.del(newsesCacheKey) // CLEAR CACHE
    const rows = await prisma.query.newses({}, queryCacheNewses) // RETRIEVE ALL NEWSES
    if (!rows.length) return null 
    const res = await redis.lpush(newsesCacheKey, ...rows.map(r => JSON.stringify(r)))
    console.log('Response from cacheNews: ', res)
    return rows
}

// -------------------------- CACHE INIT
export const initFullCache = async () => {
    const cachedUsers = await cacheUsers()
    const cachedEvents = await cacheEvents()
    const cachedNews = await cacheNews()
    return {cachedUsers, cachedEvents, cachedNews}
}

