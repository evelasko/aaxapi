import getUserId from "../utils/getUserId";

const Query = {
    users(parent, args, { prisma }, info) {
        const opArgs = { 
            first: args.first, 
            skip: args.skip,
            after: args.after,
            orderBy: args.orderBy
        }
        if (args.query) {
            opArgs.where = {
                OR: [
                    { name_contains: args.query }
                ]
            }
        }
        return prisma.query.users(opArgs, info)
    },
    me(parent, args, { prisma, request }, info) { 
        return prisma.query.user({ where: { id: getUserId(request) } }, info) 
    }
}

export { Query as default }