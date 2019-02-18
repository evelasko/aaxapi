import { Pool } from 'pg'
import { usersCachedProperties, eventsCachedProperties, newsesCachedProperties } from './constants'

export const pgDB = new Pool({connectionString: process.env.PG_CONNECTION_STRING, ssl: true})

export const getUsersData = async () => {
  const { rows } = await pgDB.query(`
    SELECT ${usersCachedProperties}
    FROM "${process.env.PG_SCHEMA_NAME}"."User";`)
  return rows.map(r => JSON.stringify(r))
}

export const getEventsData = async () => {
  const { rows } = await pgDB.query(`
    SELECT ${eventsCachedProperties}
    FROM "${process.env.PG_SCHEMA_NAME}"."Event"
    INNER JOIN "${process.env.PG_SCHEMA_NAME}"."_EventToUser"
    ON "Event"."id" = "_EventToUser"."A";`)
  return rows.map(r => JSON.stringify(r))
}

export const getNewsData = async () => {
  const { rows } = await pgDB.query(`
    SELECT ${newsesCachedProperties}
    FROM "${process.env.PG_SCHEMA_NAME}"."News"
    INNER JOIN "${process.env.PG_SCHEMA_NAME}"."_NewsToUser"
    ON "News"."id" = "_NewsToUser"."A";`)
  return rows.map(r => JSON.stringify(r))
}
