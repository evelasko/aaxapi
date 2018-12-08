const newsMutations = {
    createNews(parent, args, { prisma, request }, info) {
        return prisma.mutation.createNews({
            data: {
                title: args.data.title,
                subtitle: args.data.subtitle,
                imageURL: args.data.imageURL,
                body: args.data.body,
                published: args.data.published,
                target: args.data.target,
                author: { connect: { id : getUserId(request) } }
            }
        }, info)
    },
    async deleteNews(parent, args, { prisma, request }, info) {
        if (!await prisma.exists.Post({ id: args.id, author: {id: getUserId(request)} }) ) throw new Error('Post not found...')
        return prisma.mutation.deletePost({ where: { id: args.id }}, info)
    },
    async updateNews(parent, args, { prisma, request }, info) {
        if ( !await prisma.exists.Post({ id: args.id, author: {id: getUserId(request)} }) ) throw new Error('Post not found')
        if ( await prisma.exists.Post({ id: args.id, published: true }) && args.data.published === false ) {
            await prisma.mutation.deleteManyComments({ where: { post: { id: args.id } } })
        }
        return prisma.mutation.updatePost({ where: { id: args.id }, data: args.data }, info)
    }
}

export { newsMutations as default }