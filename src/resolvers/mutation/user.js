import bcrypt from 'bcryptjs'
import getUserId from '../../utils/getUserId'
import generateToken from '../../utils/generateToken';
import hashPassword from '../../utils/hashPassword';

const userMutations = {
    async createUser(parent, args, { prisma }, info) {
        const password = await hashPassword(args.data.password)
        const user = await prisma.mutation.createUser({ data: { ...args.data, password } })
        return {user, token: generateToken(user.id)}
    },
    async loginUser(parent, args, { prisma }, info) {
        const user = await prisma.query.user({ where: { email: args.data.email } })
        if ( !user  ) throw new Error('email not found')
        const match = await bcrypt.compare(args.data.password, user.password)
        if ( !match ) throw new Error('incorrect password, try again')
        return {user, token: generateToken(user.id)}
    },
    async deleteUser(parent, args, { prisma, request }, info) {
        return prisma.mutation.deleteUser({ where: { id: getUserId(request) } }, info)
    },
    async updateUser(parent, args, { prisma, request }, info) {
        if (typeof args.data.password === 'string') args.data.password = await hashPassword(args.data.password)
        return prisma.mutation.updateUser({ where: { id: getUserId(request) }, data: args.data }, info)
    }
}

export { userMutations as default }
