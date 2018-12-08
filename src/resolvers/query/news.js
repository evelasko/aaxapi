
const newsQueries = {
    newses(parent, args, { prisma }, info) {
        return prisma.query.newses(args, info)
    }
}

export { newsQueries as default }
