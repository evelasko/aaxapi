import nodemailer from 'nodemailer'
import mailgunTransport from 'nodemailer-mailgun-transport'
import smtpTransport from 'nodemailer-smtp-transport'
import hanldebars from 'handlebars'

import { institutional_context, UserGroups } from '../constants.js'
const auth = { auth: { api_key: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN } }
const nodemailerMailgun = nodemailer.createTransport(mailgunTransport(auth))

const testTransport = process.env.DEBUGMAIL_LOGIN ?
  nodemailer.createTransport(smtpTransport({
    host: 'debugmail.io',
    port: 25,
    auth: { user: process.env.DEBUGMAIL_LOGIN, pass: process.env.DEBUGMAIL_PASSWORD }
  }))
  : null

export const sendEmail = async (to, subject, text, name, context) => {
  const from = 'Fundación Alicia Alonso <fundacion@alicialonso.org>'
  context = {...context, ...institutional_context, host_url: process.env.HOST}

  if (!!testTransport) {
    await testTransport.sendMail({from, to, subject, text })
  } else {
    await nodemailerMailgun.sendMail(
      { from, to, subject, template: name ? { name, engine: 'handlebars', context } : {}, text },
      (err, info) => { if (err) { return {error: `Error: ${err}`} } else { return {response: `Response: ${info}`} } }
    )
  }
}

export const sendConfirmationEmail = async (to, link) => {
  const res = await sendEmail(
      to,
      'Tu nueva cuenta en alicialonso.org',
      `Por favor usa el siguiente vínculo: ${link} para confirmar tu email`,
      `templates/emailConfirmation.hbs`,
      { confirmation_link: link }
  )
}

export const sendResetPassword = async (to, link, name) => {
  const res = await sendEmail(
      to,
      'Restablecer contraseña en alicialonso.org',
      `Por favor usa el siguiente vínculo: ${link} para restablecer tu contraseña`,
      `templates/resetPassword.hbs`,
      { link, name }
  )
}

export const sendConfirmGroup = async (to, name, groupRequest) => {
  groupRequest = UserGroups[groupRequest][0]
  const res = await sendEmail(
      to,
      'Bienvenido a su nuevos grupo en alicialonso.org',
      `Por favor usa el siguiente vínculo: ${link} para iniciar sesión en tu cuenta y acceder al nuevo contenido.`,
      `templates/confirmGroupRequest.hbs`,
      { link: process.env.APP_HOST, name, groupRequest }
  )
}

export const sendRejectGroup = async (to, name, groupRequest) => {
  groupRequest = UserGroups[groupRequest][0]
  const res = await sendEmail(
      to,
      'Rechazada solicitud de grupo en alicialonso.org',
      `Lamentablemente hemos rechazado tu solicitud de incorporación al grupo ${groupRequest}. Por favor responde a este email si quisieras aportar alguna información adicional para efectuar una segunda verificación.`,
      `templates/rejectGroupRequest.hbs`,
      { link: process.env.APP_HOST, name, groupRequest }
  )
}
