import * as _ from 'lodash';
import { cacheNews } from '../cache';
// import { PUBSUB_NEW_NEWS } from '../constants';
import { Categories } from '../constants';
import { sendNotification } from '../utils/notifications';
import { getNewsById } from '../utils/queryCache';
import { aWeekFromNow, isBeforeNow } from '../utils/time';
import { deleteImage, getSecureImage, processUpload } from '../utils/upload';

const or = (search) => [{title_contains: search || ''},{subtitle_contains: search || ''},{body_contains: search || ''}]

// ---------------------------------------------------
//      TYPE DEFS
// ---------------------------------------------------

export const typeDef = `

    type ProductCategory {
        id: ID!
        name: String!
        products: [Product!]
    }

    enum ProductType {
        PRODUCT
        SERVICE
    }
    type Product {
        id: ID!
        name: String!
        unitPrice: Float!
        type: ProductType!
        category: ProductCategory!
        images: [ProductImages!] 
    }
    type ProductImage {
        id: ID! @unique
        title: String! @default(value: "untitled")
        product: Product!
        imageURL: String!
    }    
    type CustomerOrder {
        id: ID!
        customer: User!
        items: [CustomerOrderItems!]!
        invoice: Invoice!
    }
    type CustomerOrderItems {
        id: ID!
        order: CustomerOrder!
        item: Product!
        quantity: Int!
        orderPrice: Float!
    }

    type Invoice {
        id: ID!
        order: CustomerOrder!
        timeDue: DateTime!
        timePaid: DateTime
        vatRate: Int!
        netAmount: Float!
        vatAmount: Float!
        grossAmount: Float!
    }

    extend type Query {
        categories
        products
        invoices
        orders 
    }
    extend type Mutation {
        createCategory
        updateCategory
        deleteCategory
        createProduct
        updateProduct
        deleteProduct
        createOrder
        updateOrder
        confirmOrder
        settleInvoice
    }
`

// ---------------------------------------------------
//      RESOLVERS
// ---------------------------------------------------

export const Resolvers = {
    News: {
      imageURL: ({imageURL}, _, {url}) => imageURL && imageURL != 'default.png' ? getSecureImage(imageURL) : `${url}/images/default.png`
    },
    Query: {
        categories() {
            // find by: id, string on fields
            // retrieve all categories
        },
        products() {
            // find by: id, string on fields
            // filter by: category, type, price
            // sort by: name, price
        },
        invoices() {
            // find by: id, date, user
            // filter by: date range, product
            // sort by: date
        },
        orders() {
            // find by: id, date, user
            // find by: 
        },
    },
    Mutation: {
        createCategory(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {

        },
        updateCategory(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {

        },
        deleteCategory(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {

        },
        createProduct(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {},
        updateProduct(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {},
        deleteProduct(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {},
        createOrder(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {
            // also creates and link invoice
            // it must add at least one product
            // calculate VAT
        },
        updateOrder(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {
            // also updates linked invoice
            // add / delete products from order
            // update product quantity = check inventory / availability
            // if there are no products the order and its linked invoice should be deleted
        },
        confirmOrder(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {
            // change order status
        },
        settleInvoice(parent, { data }, { prisma, session: { userId, isAdmin } }, info ) {},
        async createNews(parent, { data }, { prisma, pubsub, session: { userId, isAdmin } }, info) {
            if (!userId) throw new Error('Authentication required')
            if (!isAdmin) throw new Error('Admin privileges required')
            if (!isBeforeNow(data.expiration)) throw new Error('Expiration cannot be before now...')
            let imageURL = 'default.png'
            if (data.image) {imageURL = await processUpload(data.image)}
            try {
                const res = await prisma.mutation.createNews({
                    data: {
                        title: data.title,
                        subtitle: data.subtitle,
                        imageURL,
                        body: data.body,
                        published: data.published || false,
                        target: data.target || "PUBLIC",
                        category: data.category,
                        featured: data.featured,
                        expiration: data.expiration || aWeekFromNow(),
                        deleteUpon: data.deleteUpon || false,
                        author: { connect: { id : userId } }
                    }
                }, info)
                // if the news was created then notify users
                if ( res.id ) {
                    await cacheNews()
                    const newsToSend = await getNewsById(res.id)
                    if (!newsToSend) { throw new Error('Unable to send notification... news not found on cache')}
                    const recipients = await prisma.query.users({
                        where: { AND: [
                            { notificationsDevice_not: null},
                            { group_in: newsToSend.target == 'PUBLIC' ? ['PUBLIC', 'STAFF', 'STUDENT'] : ['PUBLIC', newsToSend.target] },
                            { notificationsPermission: true}
                        ] }
                    },'{ notificationsDevice }')
                    await sendNotification(recipients, `Nueva ${Categories[data.category]}`, data.title, {id: res.id})
                }
                return res
            } catch(err) { throw new Error(err.message) }
            // const newNews = await getNewsById(res.id)
            // pubsub.publish(PUBSUB_NEW_NEWS, { newNews })
        },
        async deleteNews(parent, { id }, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getNewsById(id)
            console.log(original)
            if (original.author != userId) throw new Error('News not owned by you')
            deleteImage(original.imageURL)
            const res = await prisma.mutation.deleteNews({ where: { id }}, info)
            await cacheNews()
            return res
        },
        async updateNews(parent, {id, data}, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getNewsById(id)
            if (!original) throw new Error('News not found...')
            if (original.author != userId) throw new Error('News not owned by you')
            if ( data.expiration && !isBeforeNow(data.expiration) ) throw new Error('Expiration cannot be before now...')
            if (data.image) {
              deleteImage(original.imageURL)
              data.imageURL = await processUpload(data.image)
              data = _.omit(data, 'image')
            }
            const res = await prisma.mutation.updateNews({ where: { id }, data }, info)
            await cacheNews()
            return res
        },
        async publishNews(parent, {id}, { prisma, session: { userId } }, info) {
            if (!userId) throw new Error('Authentication required')
            const original = await getNewsById(id)
            if (!original) throw new Error('News not found...')
            if (original.author != userId) throw new Error('News not owned by you')
            if ( original.expiration && !isBeforeNow(original.expiration) ) throw new Error('Expiration cannot be before now...')
            try{
                const res = await prisma.mutation.updateNews({ where: { id }, data:{published: true} }, '{id}')
                await cacheNews()
                return {token: res.id}
            } catch(error) { return {error: `Error @publishNews: ${error.message}`} }
            
        }
    }
}
