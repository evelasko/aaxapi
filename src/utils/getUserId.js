import jwt from 'jsonwebtoken'

const getUserId = (request, requireAuth = true) => {
  
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

export { getUserId as default }
