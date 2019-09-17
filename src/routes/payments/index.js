import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import  { createPayment, processResponse } from './utils'
import { sendEmail } from '../../utils/emailService';
import formidable from 'formidable'
import cloudinary from '../../utils/upload'
import prisma from '../../prisma'
import paymentConfig from './config'

const whitelist = [
    'http://localhost',
    'http://localhost:8000', 
    'https://congreso.alicialonso.org'
]
const corsLimited = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

//-- Payment Routes Config
const paymentRoutes = express.Router()
paymentRoutes.use(express.json())
paymentRoutes.use(cors())

//-- ROUTES

paymentRoutes.get('/', async(req, res) => {
    res.send('PAYMENT ROUTE BASE')
})

//-- Get signature to process payment
paymentRoutes.post('/getsignature', cors(corsLimited), async (req, res) => {
    const { txData, description, total, urlOk, urlKo } = req.query
    const {
        signature,
        merchantParameters,
    } = createPayment({ data: txData, description, total, urlOk, urlKo})

    res.send({
        Ds_SignatureVersion: 'HMAC_SHA256_V1',
        Ds_Signature: signature,
        Ds_MerchantParameters: merchantParameters
    })
})

//-- Receive payment response from bank
paymentRoutes.post('/confirmation', express.urlencoded({ extended: true }), async ({body}, res) => {
    try {
        // console.log("BODY: ", body)

        const params = processResponse(body)
        // console.log("PARAMS: ", params)

        if (params.response) {
            //-- the transaction went thru
            const { 
                merchantParamsDecoded: { Ds_AuthorisationCode, Ds_Order, Ds_Amount },
                data: { 
                    productId, discountId,
                    firstname, lastname, email, institution }
            } = params

            //-- check if user exists
            const user = await prisma.query.user({where:{email}}, `{ id metadata }`)
            if (!user) {
                await prisma.mutation.createUser(
                    { data: { email, firstname, lastname, password: process.env.SCHEMA_GUEST_USERS_PWD } },
                    `{ id }`)
            } else {
                if (institution) {
                    await prisma.mutation.updateUser(
                        { where: { email }, data: { metadata: { institution } } },
                        `{ id }`
                    )
                }
            }

            //-- create data for the invoice and the ticket
            
            const amountCent = parseInt(Ds_Amount)
            const amountEuro = parseFloat((amountCent / 100).toFixed(2))
            let args = {
                data: {
                    total: amountEuro,
                    reference: Ds_Order,
                    paymentSettled: true,
                    customer: { connect: { email } },
                    transactions: { 
                        create: {
                            type: "SALE",
                            reference: Ds_AuthorisationCode,
                            amount: amountCent,
                        }
                    },
                    items: { 
                        create: {
                            quantity: 1,
                            orderPrice: amountEuro,
                            product: { connect: { id: productId} },
                        } 
                    }
                }
            }

            let discountRequest = null
            // add the discount to the order mutation arguments and set it to APPLIED: TRUE
            if (discountId) {
                args.data.items.create.discount = { connect: { id: discountId } }
                const fuser = await prisma.query.user(
                    {where:{email}}, 
                    `{ discountRequests(where: { discount: { id: "${discountId}"}}) { id } }`
                )
                if (fuser.discountRequests[0].id) {
                        discountRequest = await prisma.mutation.updateDiscountRequest(
                            {where:{id:fuser.discountRequests[0].id}, data:{applied:true}},
                            `{ discount { name }}`)
                }  
            }
            // create Order / Transaction
            const order = await prisma.mutation.createOrder( args, `{ id items { product { name description } } }`)
            
            
            const ticketName = discountRequest ? 
                `${order.items[0].product.name} (${discountRequest.discount.name})` 
                : 
                `${order.items[0].product.name}`
            const ticketDescription = `${order.items[0].product.description}`
        
            //-- compose and send email/ticket to buyer
            const qrcode = await QRCode.toDataURL(Ds_Order)
            const browserURL = `${process.env.HOST}payment/receipt/${order.id}`
            await sendEmail(
                email, // address to send mail to
                'Confirmación de Participación — I Congreso Mundial de Investigación en las Artes del Espectáculo', // subject
                `Por favor usa el siguiente vínculo: ${browserURL} para visualizar su ticket de confirmación de asistencia al I Congreso Mundial de Investigación en las Artes Escénicas`, // fallback text
                `views/emailticket.hbs`, //-- template file
                { 
                    qrcode,
                    browserURL, //-- variable to include in the email template with the address to access without mail client
                    Ds_Order, //-- comes from the bank's response, not from our data params
                    ticketName, 
                    ticketDescription,
                    total: (parseInt(Ds_Amount)/100).toFixed(2).toString(), //-- the amount charged for the ticket, take the one coming from the bank fromated as text incuding euro
                    fullname: `${firstname} ${lastname}`, //-- complete name of the participant
                } 
            )
            res.send("done")
        
        }
        else {
            console.log("ERROR! TRANSACTION WAS KO...")
        }
    } catch(e) { throw new Error(`@ /confirmation (create order and notify):\n${e}`)}
})

//-- render receipt in browser
paymentRoutes.get('/receipt/:orderid', express.urlencoded({extended: true}), async (req, res) => {
    const { params: { orderid } } = req
    try {
        const order = await prisma.query.order({where: { id: orderid}}, `{
            id
            reference
            total
            customer { 
                firstname 
                lastname
                addresses(where: { primary: true }) {
                    address1 address2 city region code country
                }
            }
            items {
                orderPrice
                product { name description }
                discount { name description }
                quantity
            }
        }`)

        if (!order) {
            res.send(`<h2>No Order found for ID: ${orderid} ...</h2>`)
            return
        }

        const { reference, total, items, customer: { firstname, lastname, addresses } } = order

        const qrcode = await QRCode.toDataURL(reference)
        res.render('emailticket', {
            layout: false,
            qrcode,
            Ds_Order: reference,
            ticketName: `${items[0].product.name} – ${items[0].discount ? items[0].discount.name : ''}`,
            ticketDescription: items[0].product.description,
            total: (parseInt(total)/100).toFixed(2).toString(),
            fullname: `${firstname} ${lastname}`,
            ...addresses[0]
        })
    } catch(e) { throw new Error(` @ /receipt/order (render hbs):\n ${e}`)}
})


// GET STORE DATA
// ===========================================================ß
// GENERAL
// -----------------------------------------------------------
//-- get all products
paymentRoutes.get('/products', express.urlencoded({extended:true}), async (req, res) => {
    try { res.send({ products: await prisma.query.products({}, `{ id name description }`)}) }
    catch(e) { res.send({error:e}) }
})

// ATTENDEE
// -----------------------------------------------------------

//-- get attendee base product
paymentRoutes.get('/attendee/base', async (req, res) => {
    try {
        res.send({
            baseProduct: await prisma.query.product(
                {where: {id: process.env.CONGRESS_ATT_BASE_PROD} }, 
                `{ id name description content unitPrice }`
            )
        })
    } catch(e) { res.send({ baseProduct: null, error:e}) } 
})

//-- get available discounts fo attendee's base product
paymentRoutes.get('/attendee/discounts', async (req, res) => {
    try {
        const { discounts } = await prisma.query.product(
            {where: { id: process.env.CONGRESS_ATT_BASE_PROD} },
            `{ discounts { id name description unitPrice requirements } }`
        ) //
        res.send({discounts})
    } catch(e) { res.send({ discounts: null, error: e})}
})

//-- create new discount request and notify
paymentRoutes.post('/attendee/requestdiscount', cors(corsLimited), async (req, res) => {
    var form = new formidable.IncomingForm();
    form.multiples = true
    form.parse(req, async (err, { email, discount, firstname, lastname }, { files }) => {
        try {
            const user = await prisma.query.user({where: { email }}, `{
                id firstname lastname discountRequests(where: {discount: {product: {id:"${paymentConfig.baseProductIDs.attendee}"}}}) { id }
            }`)

            if (user) {
                res.send({error: 'discount request already exists for that email address'})
                return
            }
            let fl = []
            if (!Array.isArray(files)) { fl.push(files) }
            else { fl = files }
            let res_promises = fl.map(file => new Promise((resolve, reject) => {
                cloudinary.v2.uploader.upload(file.path, { 
                        folder: 'congreso_documentacion',
                        use_filename: true,
                        unique_filename: true 
                    }, 
                    function (error, result) {
                        if(error) reject(error)
                        else resolve(result.secure_url)
                    }
                )
            })
            )
        
            // Promise.all will fire when all promises are resolved 
            Promise.all(res_promises)
            .then(async (result) => {

                // -- configure prisma mutation's user connection
                let requestee = { create: { firstname, lastname, email, password:process.env.SCHEMA_GUEST_USERS_PWD } }
                if (user) {
                    requestee = { connect: { id: user.id} }
                }

                // create new request
                const newRequest = await prisma.mutation.createDiscountRequest(
                    { data:{ 
                        discount: {connect: {id: discount}},
                        user: requestee,
                        documentation: {set: result},
                    }},
                    `{ id user { firstname lastname } discount { name description product { name description} } }`
                )

                // notify 
                const approveLink = `${process.env.HOST}payment/discount/approve/${newRequest.id}`
                const link = `${process.env.HOST}payment/view/discountrequest/${newRequest.id}`

                await sendEmail(
                    paymentConfig.notifications.recipients.newDiscountRequest.toString(), // addresses to send mail to
                    'Nueva Solicitud de Descuento', // subject
                    `Por favor usa el siguiente vínculo: ${link} para visualizar los detalles del descuento solicitado.`, // fallback text
                    `views/congressDiscountApprove.hbs`, //-- template file
                    { 
                        link,
                        productName: `${newRequest.discount.product.name} –— ${newRequest.discount.name}`,
                        discount: newRequest.discount.name,
                        approveLink,
                        fullname: `${firstname} ${lastname}`,
                        documentation: result
                    } 
                )
                res.send({newRequest})
            })
            .catch((error) => { throw new Error(`@ route payment/attendee/requestdiscount (promise.all): ${error}`) })
        } catch(e) { throw new Error(`@ route payment/attendee/requestdiscount (form.parse): \n${e}\n\n`)}
    })
})

//-- render view of requested discount in browser
paymentRoutes.get('/view/discountrequest/:id', express.urlencoded({extended: true}), async (req, res) => {
    const { params: { id } } = req
    if (!id) {
        res.send(`<h1>404 Page Not Found</h1><p>Missing discount request's ID...</p>`)
        return
    }
    const discountQuery = await prisma.query.discountRequest({where: {id}}, `{
        id  documentation user { firstname lastname }
        discount { name description unitPrice product { name description } }
    }`)  
    
    if (!discountQuery) {
        res.send(`<h1>787 Unable to Load</h1><p>No Order for ${orderid} was found...</p>`)
        return
    }

    const { documentation, user: { firstname, lastname }, discount  } = discountQuery
    res.render('congressDiscountApprove', {
        layout: false,
        documentation,
        productName: `${discount.product.name} (${discount.name})`,
        discount:`${discount.product.description}\n${discount.description}`,
        fullname: `${firstname} ${lastname}`,
        approveLink: `${process.env.HOST}payment/discount/approve/${discount.id}`
    })
})

//-- approve discount
paymentRoutes.get('/discount/approve/:id', express.urlencoded({extended: true}), async (req, res) => {
    const { params: { id } } = req
    const discountRequest = await prisma.query.discountRequest({where: {id}}, `{applied approved}`)
    if (!discountRequest) {
        // discount request was not found
        res.send('<h2>The discount request was not found...</h2>')
        return
    }
    if (discountRequest.applied || discountRequest.approved) {
        // discount request has been either applied or already approved
        res.send(`<h2>No changes allowed for status:</h2><p>applied: ${discountRequest.applied}</p><p>approved:${discountRequest.approved}</p>`)
        return
    }
    try {
        const mutatedRequest = await prisma.mutation.updateDiscountRequest(
            {where: {id}, data: {approved: true}}, 
            `{
                approved
                user { email firstname lastname }
                discount { name description product { name }}
             }`
        ) 
        if (mutatedRequest.approved) {
            // notify user
            const { discount, user } = mutatedRequest
            await sendEmail(
                mutatedRequest.user.email, // addresses to send mail to
                'Confirmación Descuento: Congreso Mundial de Investigación en Artes del Espectáculo', // subject
                `El descuento solicitado ha sido exitosamente confirmado.
                Puede continuar el proceso de compra visitando https://congreso.alicialonso.org
                En el formulario de compra deberá introducir la misma dirección a la que ha recibido este email.
                \n\n Muchas gracias, esperamos verle pronto.`, // fallback text
                `views/congressDiscountNotify.hbs`, //-- template file
                { 
                    link: paymentConfig.links.attendeeBuyForm,
                    productName: `${discount.product.name} –— ${discount.name}`,
                    discount: discount.description,
                    buyLink: paymentConfig.links.attendeeBuyForm,
                    fullname: `${user.firstname} ${user.lastname}`,
                } 
            )
            res.send(`<h2>Successfully Approved and Notified</h2><p>${JSON.stringify(mutatedRequest)}</p>`)
        }
    } catch(e) { res.send(`<h2>Error</h2><p>${JSON.stringify(e)}</p>`) }
}) 

//-- find discount of attendee
paymentRoutes.get('/attendee/find/discount', async (req, res) => {
    const { email } = req.query
    try {
        if (!email) {
            res.send({ foundDiscount: null, error: 'please provide an email address'})
            return
        }
        let error = null

        let foundUser = await prisma.query.user(
            {where: { email}},
            `{ id firstname lastname metadata }`
        )
        let foundDiscount = await prisma.query.user(
            {where: {email}},
            `{
                email firstname lastname metadata
                discountRequests
                (where: { discount: { product: {id: "${paymentConfig.baseProductIDs.attendee}"} } })
                { id applied approved discount { id name description unitPrice } }
            }`
        )
        
        if (foundDiscount && foundDiscount.discountRequests.length) {
            if (foundDiscount.discountRequests[0].applied) 
                { error = 'La dirección de email ya ha usado un descuento' }
            if (!foundDiscount.discountRequests[0].approved)
                { error = 'La dirección de email ya tiene una solicitud descuento en revisión, se le notificará una vez la comisión confirme su solicitud'}
        }
        // send the whole object in the response
        res.send({ foundUser, error})

    } catch(e) {  res.send({ foundUser: null, error:`ERROR: ${e}`}) }
})

export default paymentRoutes