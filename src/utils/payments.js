import express from 'express';
import CryptoJS from 'crypto-js';
import qs from 'qs';
import axios from 'axios';
const Redsys = require('node-redsys-api').Redsys;
const orderid = require('order-id')(process.env.JWT_SECRET)

function generateOrderId() {
    var chars = "abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ";
    return orderid.generate().replace("-", chars.substr( Math.floor(Math.random() * 53) , 1))
}


//Snippet to obtain the signature & merchantParameters
const createPayment = ({data, description, ccv, expiry, total, pan, titular, paymentId, url, urlOK, urlKO}) => {
    const redsys = new Redsys();
    const {DS_MERCHANT_CODE, DS_MERCHANT_CURRENCY, DS_MERCHANT_TERMINAL, DS_MERCHANT_KEY } = process.env
    const mParams = {
        "DS_MERCHANT_AMOUNT":Math.round(total*100).toString(),
        "DS_MERCHANT_ORDER":paymentId,
        "DS_MERCHANT_PRODUCTDESCRIPTION":description,
        "DS_MERCHANT_MERCHANTDATA": data,
        "DS_MERCHANT_TITULAR":titular,
        "DS_MERCHANT_MERCHANTCODE":DS_MERCHANT_CODE,
        "DS_MERCHANT_MERCHANTNAME":"Fundacion Alicia Alonso",
        "DS_MERCHANT_CURRENCY":DS_MERCHANT_CURRENCY,
        "DS_MERCHANT_TRANSACTIONTYPE":"0",
        "DS_MERCHANT_TERMINAL":DS_MERCHANT_TERMINAL,
        "DS_MERCHANT_PAN":pan,
        "DS_MERCHANT_EXPIRYDATE":expiry,
        "DS_MERCHANT_CVV2":ccv,
        "DS_MERCHANT_MERCHANTURL":url,
        "DS_MERCHANT_URLOK":urlOK,
        "DS_MERCHANT_URLKO":urlKO
    };
    console.log(`PARAMS TO SING\n________________________${JSON.stringify(mParams)}\n_____________________`)
    return  {
        signature: redsys.createMerchantSignature(DS_MERCHANT_KEY, mParams),
        merchantParameters: redsys.createMerchantParameters(mParams),
        raw: mParams
    };
}

const paymentRoutes = express.Router()

paymentRoutes.use(express.urlencoded())
paymentRoutes.post('/', async (req, res) => {
    // check if verification token is correct
    // if (req.query.token !== token) {
    //     return res.sendStatus(401);
    // }
  
    // print request body
    console.log('Req Body: ',req.body);


    const {expiry, ccv, email} = req.body
    const pan = CryptoJS.AES.decrypt(req.body.codenumber, process.env.JWT_SECRET).toString(CryptoJS.enc.Utf8)
    const paymentId = generateOrderId()

    const paymentData = {
        description:'Participacion Regular', 
        // Opcional. 125 se considera su longitud máxima. 
        // Este campo se mostrará al titular en la pantalla de confirmación de la compra
        ccv, 
        expiry,     
        // Opcional. Caducidad de la tarjeta. 
        // Su formato es AAMM, siendo AA los dos últimos dígitos del año y MM los dos dígitos del mes
        total:180.00,  
        // Obligatorio. Para Euros las dos últimas posiciones se consideran decimales
        pan, 
        titular: 'Fundacion Alicia Alonso',    
        // Opcional. Su longitud máxima es de 60 caracteres. 
        // Este campo se mostrará al titular en la pantalla de confirmación de la compra.
        paymentId,   
        // Obligatorio. Se recomienda, por posibles problemas en el proceso de liquidación, 
        // que los 4 primeros dígitos sean numéricos. 
        // Para los dígitos restantes solo utilizar los siguientes caracteres ASCII
        // Del 48 = 0 al 57 = 9 - Del 65 = A al 90 = Z - Del 97 = a al 122 = z
        url:process.env.HOST + "payment/confirmation",  
        // Obligatorio si el comercio tiene notificación “on-line”.
        // URL del comercio que recibirá un post con los datos de la transacción
        urlOK:process.env.HOST + "payment/confirmation/ok",
        urlKO:process.env.HOST + "payment/confirmation/ko",
        data: email    
        // Opcional para el comercio para ser incluidos en los datos
        // enviados por la respuesta “on-line” al comercio si se ha elegido esta opción
    }

    const msg1 = `Payment Data:\n____________________________________\n${JSON.stringify(paymentData)}\n_________________________________`
    console.log(msg1)

    const {signature, merchantParameters, raw} = createPayment(paymentData)

    const msg2 = `\nSIGNATURE:\n${signature}\n_____________________________________\nPARAMS:\n${merchantParameters}`
    console.log(msg2)

    const msg3 = JSON.stringify(raw)

    const formData = { 
        Ds_SignatureVersion: 'HMAC_SHA256_V1',
        Ds_MerchantParameters: merchantParameters,
        Ds_Signature: signature 
    };
    const options = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: qs.stringify(formData),
    url: process.env.DS_PAYMENT_GATEWAY,
    };

    axios(options).then( (response) => {
        console.log("Axios Response")
    console.log('RESPONSE: ',JSON.stringify(response));
  });

    // return a text response
    const data = {
        responses: [
            {
                type: 'text',
                elements: [msg1, msg2, msg3]
            },
            {
                type: 'json',
                raw: { raw },
                data: { paymentData }
            }
        ]
    };
  
    res.json(data);
  });

paymentRoutes.post('/confirmation', async (req, res) => {
    console.log('/confirmation Req Body: ',JSON.stringify(req));
})

paymentRoutes.post('/confirmation/ok', async (req, res) => {
    console.log('/ok Req Body: ',req.body);
})

paymentRoutes.post('/confirmation/ko', async (req, res) => {
    console.log('/ko Req Body: ',req.body);
})

export default paymentRoutes