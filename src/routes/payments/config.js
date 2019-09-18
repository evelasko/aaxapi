const host = process.env.HOST

const paymentConfig = {
    paymentConfirmationRoute: host + "payment/confirmation",
    payment_OK_Route: host + 'payment/confirmation/ok',
    payment_KO_Route: host + 'payment/confirmation/ko',
    notifications: {
        recipients: {
            newDiscountRequest: [
                'congreso@alicialonso.org'
            ],
            newOrderConfirmed: [
                'congreso@alicialonso.org',
                'luis.llerena@urjc.es'
            ]
        }
    },
    links: {
        attendeeBuyForm: 'https://congreso.alicialonso.org/es-ES/payment/atendee/',
        speakerBuyForm: 'https://congreso.alicialonso.org/es-ES/payment/speaker/',
        requestDiscountForm: 'https://congreso.alicialonso.org/es-ES/payment/discount/'
    },
    baseProductIDs: {
        attendee: process.env.CONGRESS_ATT_BASE_PROD,
        speaker: process.env.CONGRESS_SPK_BASE_PROD
    }
}

export default paymentConfig