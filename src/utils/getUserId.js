import jwt from 'jsonwebtoken'

export const getUserId = (key) => {
  try {
    const { id } = jwt.verify(key, process.env.JWT_SECRET)
    return id
  } catch(error) { return {error: error.message} }
}

export const getSessionUserId = session => {
  if (session.userId) return session.userId
  return null
}

export const getUserGroup = async (prisma, session) => {
  const id = getSessionUserId(session)
  if (!id) return ['PUBLIC']
  try {
    const usr = await prisma.query.user({where: { id }}, '{group isAdmin}')
    if (usr && !usr.isAdmin) { return userGroup.push('PUBLIC', usr.group) }
    else if (usr && usr.isAdmin) { return null }
  }
  catch(error) {
    return ['PUBLIC']
  }
  return ['PUBLIC']
}
