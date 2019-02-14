import _ from 'lodash'
import { getCachedUsers } from '../cache'

// FIND USERS WITH GROUP REQUESTS
export const getGroupRequests = async () => {
  const users = await getCachedUsers()

}
