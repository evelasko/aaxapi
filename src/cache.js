import { usersCacheKey } from './constants'
import { redis } from './server'
import { getUsersData } from './pg'

export const hell = 'HellO'

export const cacheUsers = async () => {
  // CLEAR CACHE
  await redis.del(usersCacheKey)
  // FILL CACHE
  const data =  await getUsersData()
  // console.log('DATA in Loader: ', data)
  await redis.lpush(usersCacheKey, ...data)
  return data
}

export const getCachedUsers = async () => {
  // BUILD CACHED USERS OBJECT
  const users = await redis.lrange(usersCacheKey, 0, -1) || []
  const cachedUsers = {}
  users.forEach(u => { cachedUsers[JSON.parse(u).id] = JSON.parse(u) })
  // console.log('cachedUsers: ', cachedUsers)
  return cachedUsers
}

export const getCachedUsersArray = async () => {
  const response = await redis.lrange(usersCacheKey, 0, -1) || []
  const cachedUsers = response.map(user => JSON.parse(user))
  return cachedUsers
}
