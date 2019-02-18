export const redisSessionPrefix = "sess:"
export const userSessionIdPrefix = "userSids:"
export const forgotPasswordPrefix = "forgotPassword:"
export const usersCacheKey = 'usersCache'
export const usersCachedProperties = `id, email, "isAdmin", "emailVerified", "groupRequest", "group", password, name, lastname`
export const eventsCacheKey = 'eventsCache'
export const eventsCachedProperties = `"Event".id, "Event"."imageURL", "Event"."date", "Event"."target", "Event"."deleteUpon", "Event".published, "_EventToUser"."B" AS author`
export const newsesCacheKey = 'newsesCache'
export const newsesCachedProperties = `"News"."id", "News"."imageURL", "News"."expiration", "News"."target", "News"."deleteUpon", "News".published, "News"."category", "_NewsToUser"."B" AS author`

// Institutional Data
export const institutional_context = {
  facebook_link: "https://facebook.com",
  twitter_link: "https://twitter.com",
  instagram_link: "https://instagram.com",
  linkedin_link: "https://linkedin.com",
  mailto_link: "mailto:soporte@alicialonso.org"
}

// Internal Strings
export const Categories = {
    NEWS:['Noticia','noticia'],
    ALERT:['Alerta', 'alerta'],
    CALL:['Convocatoria', 'convocatoria']
}

export const UserGroups = {
    PUBLIC:['General', 'general'],
    STAFF:['Staff', 'staff'],
    STUDENT:['Estudiante', 'estudiante']
}

export const nIdTypes = {
    PASSPORT:['Pasaporte', 'pasaporte'],
    NATIONALID:['DNI', 'DNI'],
    SOCIALSECURITY:['Seguridad Social', 'Seguridad Social'],
    OTHER:['Otro', 'otro']
}
