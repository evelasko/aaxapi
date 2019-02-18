import { usersCacheKey, eventsCacheKey, newsesCacheKey } from './constants'
import { redis } from './server'
import { getUsersData, getEventsData, getNewsData } from './pg'

// -------------------------- CACHE USERS
export const cacheUsers = async () => {
  await redis.del(usersCacheKey) // CLEAR CACHE
  const data =  await getUsersData() // FILL CACHE
  const res = await redis.lpush(usersCacheKey, ...data)
  console.log('Response from cacheUsers: ', res)
  return data
}

// -------------------------- CACHE EVENTS
export const cacheEvents = async () => {
  await redis.del(eventsCacheKey) // CLEAR CACHE
  const data =  await getEventsData() // FILL CACHE
  const res = await redis.lpush(eventsCacheKey, ...data)
  console.log('Response from cacheEvents: ', res)
  return data
}

// -------------------------- CACHE NEWSES
export const cacheNews = async () => {
  await redis.del(newsesCacheKey) // CLEAR CACHE
  const data =  await getNewsData() // FILL CACHE
  const res = await redis.lpush(newsesCacheKey, ...data)
  console.log('Response from cacheNews: ', res)
  return data
}

// -------------------------- CACHE INIT
export const initFullCache = async () => {
  const cachedUsers = await cacheUsers()
  const cachedEvents = await cacheEvents()
  const cachedNews = await cacheNews()
  return {cachedUsers, cachedEvents, cachedNews}
}

// -------------------------- READ CACHE
export const getCachedData = async (key) => {
  const response = await redis.lrange(key, 0, -1) || []
  return response.map(item => JSON.parse(item))
}
