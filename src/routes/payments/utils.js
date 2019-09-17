import shortid from 'shortid';
const Entities = require('html-entities').AllHtmlEntities;
const Redsys = require('node-redsys-api').Redsys;
const orderid = require('order-id')(process.env.JWT_SECRET)
import paymentConfig from './config'

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
export const createPayment = ({data, description, total, titular, paymentId, urlOk, urlKo}) => {
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
        "DS_MERCHANT_MERCHANTURL": paymentConfig.paymentConfirmationRoute,
        "DS_MERCHANT_URLOK": urlOk || paymentConfig.payment_OK_Route,
        "DS_MERCHANT_URLKO":urlKo || paymentConfig.payment_KO_Route
    };
    return  {
        signature: redsys.createMerchantSignature(process.env.DS_MERCHANT_KEY, mParams),
        merchantParameters: redsys.createMerchantParameters(mParams),
        raw: mParams
    };
}

export const processResponse = (tpvResponse) => {
    //Snippet to process the TPV callback

    const redsys = new Redsys(); 
    const merchantParams = tpvResponse.Ds_MerchantParameters || tpvResponse.DS_MERCHANTPARAMETERS;
    const signature = tpvResponse.Ds_Signature || tpvResponse.DS_SIGNATURE;

    const merchantParamsDecoded = redsys.decodeMerchantParameters(merchantParams);
    const merchantSignatureNotif = redsys.createMerchantSignatureNotif(process.env.DS_MERCHANT_KEY, merchantParams);
    const dsResponse = parseInt(merchantParamsDecoded.Ds_Response || merchantParamsDecoded.DS_RESPONSE);

    const entities = new Entities();

    if (redsys.merchantSignatureIsValid(signature , merchantSignatureNotif) && dsResponse > -1 && dsResponse < 100 ) {
        console.log('😉 TPV 支払い OK');
        return { 
            merchantParamsDecoded, 
            data: JSON.parse(entities.decode(merchantParamsDecoded.Ds_MerchantData)),
            Ds_AuthorisationCode: merchantParamsDecoded.Ds_AuthorisationCode,
            response: true
        }
    } else {
        console.log('😣 TPV 支払い was KO');
        return { merchantParamsDecoded, response: false}
    }
}