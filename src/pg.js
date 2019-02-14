import { Pool } from 'pg'
import { usersCachedProperties } from './constants'

export const pgDB = new Pool({connectionString: process.env.PG_CONNECTION_STRING, ssl: true})

export const getUsersData = async () => {
  const { rows } = await pgDB.query(`SELECT ${usersCachedProperties} FROM "${process.env.PG_SCHEMA_NAME}"."User";`)
  return rows.map(r => JSON.stringify(r))
}
