import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import  { createPayment, processResponse } from './utils'
import manager, { Product, Discount, Invoice, pCategory, addDiscount } from './manager'; 
import { sendEmail } from '../../utils/emailService';

const whitelist = [
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

// Payment Routes Config
const paymentRoutes = express.Router()
paymentRoutes.use(express.json())
paymentRoutes.use(cors())

// Payment Routes
paymentRoutes.post('/', async (req, res) => {
    // check if verification token is correct
    // if (req.query.token !== token) {
    //     return res.sendStatus(401);
    // }
  
    // print request body
    // console.log('Req Body: ',req.body);

    
    const data = {
        responses: [
            {
                type: 'text',
                elements: "request received"
            },
        ]
    };
  
    res.json(data);
});

// Get signature to process payment
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

// Receive payment response from bank
paymentRoutes.post('/confirmation', express.urlencoded({ extended: true }), async ({body}, res) => {

    // const body = { 
    //             Ds_SignatureVersion: 'HMAC_SHA256_V1',
    //             Ds_MerchantParameters: 'eyJEc19EYXRlIjoiMjhcLzA4XC8yMDE5IiwiRHNfSG91ciI6IjEyOjI3IiwiRHNfU2VjdXJlUGF5bWVudCI6IjEiLCJEc19DYXJkX0NvdW50cnkiOiI3MjQiLCJEc19BbW91bnQiOiIxMDAiLCJEc19DdXJyZW5jeSI6Ijk3OCIsIkRzX09yZGVyIjoiMjczN01Sb0xvSFgiLCJEc19NZXJjaGFudENvZGUiOiIyODU0NjU3MjAiLCJEc19UZXJtaW5hbCI6IjAwMiIsIkRzX1Jlc3BvbnNlIjoiMDAwMCIsIkRzX01lcmNoYW50RGF0YSI6InsmIzM0O2ZpcnN0bmFtZSYjMzQ7OiYjMzQ7RW5yaXF1ZSYjMzQ7LCYjMzQ7bGFzdG5hbWUmIzM0OzomIzM0O1BlcmV6JiMzNDssJiMzNDtlbWFpbCYjMzQ7OiYjMzQ7ZGVzY3VlbnRvQGVzdHVkaWFudGUuY29tJiMzNDssJiMzNDthZGRyZXNzMSYjMzQ7OiYjMzQ7RWR1YXJkbyBSaXZhcyAxNCYjMzQ7LCYjMzQ7YWRkcmVzczImIzM0OzomIzM0OyYjMzQ7LCYjMzQ7Y291bnRyeSYjMzQ7OiYjMzQ7U3BhaW4mIzM0OywmIzM0O3JlZ2lvbiYjMzQ7OiYjMzQ7TWFkcmlkJiMzNDssJiMzNDtjaXR5JiMzNDs6JiMzNDtNYWRyaWQmIzM0OywmIzM0O3ppcCYjMzQ7OiYjMzQ7MjgwMDkmIzM0OywmIzM0O3RvdGFsJiMzNDs6MX0iLCJEc19UcmFuc2FjdGlvblR5cGUiOiIwIiwiRHNfQ29uc3VtZXJMYW5ndWFnZSI6IjEiLCJEc19BdXRob3Jpc2F0aW9uQ29kZSI6IjMzMTIxNCIsIkRzX0NhcmRfQnJhbmQiOiIxIn0=',
    //             Ds_Signature: 't7X1rLJU-71qunQkBMcrT8QG6Zb-pQXeH_U_U_HZ2Bs=' 
    //         }

    const params = processResponse(body)

    if (params.response) {
        // the transaction went thru

        // create data for the invoice and the ticket
        const { 
            merchantParamsDecoded: { Ds_AuthorisationCode, Ds_Order, Ds_Amount },
            data: { 
                // productId, 
                firstname, lastname, email, address1, address2, city, region, country, zip }
        } = params

        // fake product ID for testing
        const productId = "156f39d8-6521-4a1a-b263-2f29f9f5e8e8"
        // retrieve the product from database using the id that came in the json data parameter
        const purchasedProduct = await Product.findOne({ where: { id: productId }})

        // create new invoice 
        let receipt = await Invoice.create({
            email, firstname, lastname, address1, address2, city, region, country, zip,
            orderid: Ds_Order,
            paymentid: Ds_AuthorisationCode,
            amount: Ds_Amount
        })
        // link invoice to purchased product
        receipt = await receipt.setProduct(purchasedProduct)
        // check if discount and set applied to true
        const discount = await Discount.findOne({ where: { email }})
        if (discount) { discount.setDataValue('applied', true) }
        
        // compose and send email/ticket to buyer
        const qrcode = await QRCode.toDataURL(Ds_Order)

        console.log(`\n\n\nQR CODE:\n\n${qrcode}\n\n\n`)
        const browserURL = `${process.env.HOST}payment/receipt/${Ds_Order}`
        const mailResponse = await sendEmail(
            email, // address to send mail to
            'Confirmación de Participación — I Congreso Mundial de Investigación en las Artes del Espectáculo', // subject
            `Por favor usa el siguiente vínculo: ${browserURL} para visualizar su ticket de confirmación de asistencia al I Congreso Mundial de Investigación en las Artes Escénicas`, // fallback text
            `views/emailticket.hbs`, // template file
            { 
                qrcode,
                browserURL, // variable to include in the email template with the address to access without mail client
                Ds_Order, // comes from the bank response, not from our data params
                ticketName: purchasedProduct.name, //ombine product name with product description,
                ticketDescription: purchasedProduct.description,
                total: (parseInt(Ds_Amount)/100).toFixed(2).toString(), // the amount charged for the ticket, take the one coming from the bank fromated as text incuding euro
                fullname: `${firstname} ${lastname}`, // complete name of the participant
                address1, 
                address2, 
                city, 
                region, 
                country, 
                zip 
            } 
        )
        res.send("done")
    }
    else {
        console.log("TRANSACTION WAS KO...")
    }

    
})


// render receipt in browser
paymentRoutes.get('/receipt/:orderid', express.urlencoded({extended: true}), async (req, res) => {
    const { params: { orderid } } = req
    const invoice = await Invoice.findOne({ where: { orderid }, include: [{ model:Product }] })
    if (!invoice) {
        res.send(`<h2>No Order for ${orderid} was found...</h2>`)
        return null
    }
    // res.send(invoice)
    // return null
    const { address1, address2, city, region, country, zip } = invoice
    const qrcode = await QRCode.toDataURL(orderid)
    res.render('emailticket', {
        layout: false,
        qrcode,
        Ds_Order: orderid,
        ticketName: invoice.product.name,
        ticketDescription: invoice.product.description,
        total: (parseInt(invoice.amount)/100).toFixed(2).toString(),
        fullname: `${invoice.firstname} ${invoice.lastname}`,
        address1, 
        address2, 
        city, 
        region, 
        country, 
        zip 
    })
})



// GET STORE DATA
// ===========================================================ß
// GENERAL
// -----------------------------------------------------------
// get all products
paymentRoutes.get('/products', express.urlencoded({extended:true}), async (req, res) => {
    try { res.send({ products: await Product.findAll() }) }
    catch(e) { res.send({error:e}) }
})
// create new product ***
paymentRoutes.get('/product/new', async (req, res) => {
    try { res.send({ discounts: await Discount.findAll() }) }
    catch(e) { res.send({error:e}) }
})

// ATTENDEE
// -----------------------------------------------------------
// get attendee store data
paymentRoutes.get('/attendee/data', async (req, res) => {
    try {
        res.send({ 
            products: await Product.findAll({ where: { category: 'Atendee'}}),
            discounts: await Discount.findAll({
                include: [{ model: Product, where: { category: 'Atendee'}}]
            }),
            baseProduct: await Product.findByPk('6cc4f753-be5e-43b7-b802-c45f14fa6164')
        })
    }
    catch (e) { res.send({error:e}) }
})
// set new discount and notify
paymentRoutes.post('assignDiscount', cors(corsLimited), async (req, res) => {
    const { email, productId } = req.query
    try { const newDiscount = addDiscount({email, productId}) } 
    catch(e) { res.send({error:e}) }
})
// SPEAKER
// get speaker data
paymentRoutes.get('/speaker/data', async (req, res) => {
    res.send({ 
        products: await Product.findAll({ where: { category: 'Speaker'}}),
        discounts: await Discount.findAll({
            include: [{ model: Product, where: { category: 'Speaker'}}]
        }),
        baseProduct: await Product.findByPk('6cc4f753-be5e-43b7-b802-c45f14fa6164')
    })
})
// get all invoices
paymentRoutes.get('/invoices', async (req, res) => {
    res.send({ invoices: await Invoice.findAll() })
})
// get invoices for email
paymentRoutes.get('/invoices/find', async (req, res) => {
    const { email } = req.query
    res.send({ 
        invoice: await Invoice.findAll({ where: { email }}) })
})
// PASSES

// get PASS for email



export default paymentRoutes