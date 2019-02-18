import _ from 'lodash'
import { usersCacheKey, eventsCacheKey, newsesCacheKey } from '../constants'
import { getCachedData } from '../cache'

// -------------------------- USER QUERIES
export const getGroupRequests = async () => {
  const users = await getCachedData(usersCacheKey)
  return users.filter(u => u.groupRequest != null || null)
}

export const getUserByEmail = async (email) => {
  const users = await getCachedData(usersCacheKey)
  return users.filter(u => u.email === email)[0] || null
}

export const getUserById = async (id) => {
  const users = await getCachedData(usersCacheKey)
  return users.filter(u => u.id === id)[0] || null
}

// -------------------------- EVENT QUERIES
export const getEventById = async (id) => {
  const events = await getCachedData(eventsCacheKey)
  if (!id) return events
  return events.filter(e => e.id === id)[0] || null
}

// -------------------------- NEWS QUERIES
export const getNewsById = async (id) => {
  const newses = await getCachedData(newsesCacheKey)
  if (!id) return newses
  return newses.filter(n => n.id === id)[0] || null
}
