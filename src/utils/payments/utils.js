import shortid from 'shortid';
const Redsys = require('node-redsys-api').Redsys;
const orderid = require('order-id')(process.env.JWT_SECRET)

//Snippet to generate order reference
export const generateOrderId = () => {
    var chars = 'abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
    shortid.characters(
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_',
    );
    return (
      orderid
        .generate()
        .slice(12, 16)
        .split('')
        .reverse()
        .join('') +
      shortid
        .generate()
        .replace('-', chars.substr(Math.floor(Math.random() * 53), 1))
        .replace('_', chars.substr(Math.floor(Math.random() * 53), 1))
    ).slice(0, 11);
  };

//Snippet to obtain the signature & merchantParameters
const createPayment = ({data, description, total, titular, paymentId, url, urlOk, urlKo}) => {
    const redsys = new Redsys();
    const {DS_MERCHANT_CODE, DS_MERCHANT_CURRENCY, DS_MERCHANT_TERMINAL, DS_MERCHANT_KEY } = process.env
    const mParams = {
        "DS_MERCHANT_AMOUNT": Math.round(total*100).toString(),
        "DS_MERCHANT_ORDER": paymentId || generateOrderId(),
        "DS_MERCHANT_PRODUCTDESCRIPTION": description || "no description",
        "DS_MERCHANT_MERCHANTDATA": data || "no data",
        "DS_MERCHANT_TITULAR":titular || "Fundacion Alicia Alonso",
        "DS_MERCHANT_MERCHANTCODE":DS_MERCHANT_CODE,
        "DS_MERCHANT_MERCHANTNAME":"Fundacion Alicia Alonso",
        "DS_MERCHANT_CURRENCY":DS_MERCHANT_CURRENCY,
        "DS_MERCHANT_TRANSACTIONTYPE":"0",
        "DS_MERCHANT_TERMINAL":DS_MERCHANT_TERMINAL,
        // "DS_MERCHANT_PAN":pan,
        // "DS_MERCHANT_EXPIRYDATE":expiry,
        // "DS_MERCHANT_CVV2":ccv,
        "DS_MERCHANT_MERCHANTURL": process.env.HOST + "payment/confirmation",
        "DS_MERCHANT_URLOK": urlOk || process.env.HOST + "payment/confirmation/ok",
        "DS_MERCHANT_URLKO":urlKo
    };
    return  {
        signature: redsys.createMerchantSignature(DS_MERCHANT_KEY, mParams),
        merchantParameters: redsys.createMerchantParameters(mParams),
        raw: mParams
    };
}

export default createPayment