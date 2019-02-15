import _ from 'lodash'
import { getCachedUsers, getCachedUsersArray } from '../cache'

// FIND USERS WITH GROUP REQUESTS
export const getGroupRequests = async () => {
  const users = await getCachedUsers()
  const requests = _.pickBy(users, value => !!value.groupRequest)
  return requests
}


export const getUserByEmail = async (email) => {
  const users = await getCachedUsersArray()
  return users.filter(u => u.email === email)[0] || null
}

export const getUserById = async (id) => {
  const users = await getCachedUsersArray()
  return users.filter(u => u.id === id)[0] || null
}
