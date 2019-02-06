import nodemailer from 'nodemailer'
import mailgunTransport from 'nodemailer-mailgun-transport'
import hanldebars from 'handlebars'

import institutional_context from '../constants.js'

const auth = { auth: { api_key: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN } }
const nodemailerMailgun = nodemailer.createTransport(mailgunTransport(auth))

export const sendEmail = async (to, subject, text, name, context) => {
  const res = await nodemailerMailgun.sendMail({
    from: 'Fundación Alicia Alonso <fundacion@alicialonso.org>',
    to,
    subject,
    template: name ?
                { name, engine: 'handlebars', context: {...context, ...institutional_context, host_url: process.env.HOST}}
                :
                {},
    text
    },
    (err, info) => { console.log('@mail: ', info); console.log('@err: ', err); if (err) { return {error: `Error: ${err}`} } else { return {response: `Response: ${info}`} } }
  )
}
