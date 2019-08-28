import express from 'express';
import cors from 'cors';
import createPayment, { generateOrderId } from './utils'
import manager, { Product, Discount, Invoice, pCategory, addDiscount } from './manager'; 

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
    
    console.log("Payment signature requested")
    
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
paymentRoutes.post('/confirmation', express.urlencoded({ extended: true }), async (req, res) => {
    console.log('/confirmation Req Body: ', req);
    res.send("payment confirmation listener outlet")
})

// Check discounts available for email address
paymentRoutes.post('/checkdiscount', cors(corsLimited), async (req, res) => {
    const { email } = req.query
    // const check = await prisma
})

// GET STORE DATA
// ===========================================================
// GENERAL
// -----------------------------------------------------------
// get all products
paymentRoutes.get('/products', async (req, res) => {
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