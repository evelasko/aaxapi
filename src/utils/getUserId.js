import jwt from 'jsonwebtoken'

export const getUserId = (request, requireAuth = true) => {

    const header = request.request ? request.request.headers.authorization : request.connection.context.Authorization

    if (header) {
        const decoded = jwt.verify( header.replace('Bearer ', '') , process.env.JWT_SECRET)
        return decoded.userId
    }
    if (requireAuth) {
        throw new Error('Athentication required!')
    }
    return null
}

export const getSessionUserId = session => {
  console.log('SESSION >>>>>>>>> ', session)
  console.log('COOKIE', session.cookie)
  if (session.userId) return session.userId
  throw new Error('Authentication required!')
}

export const getUserGroup = async (prisma, session) => {
  const userGroup = []
  try {
    const usr = await prisma.query.user({where: {id: getSessionUserId(session)}}, '{group isAdmin}')
    if (usr && !usr.isAdmin) { return userGroup.push('PUBLIC', usr.group) }
    else if (usr && usr.isAdmin) { return null }
  }
  catch(error) {
    console.log('Error from query getUserGroup!: ', error)
  }
  return ['PUBLIC']
}
