import nodemailer from 'nodemailer';
import mailgunTransport from 'nodemailer-mailgun-transport';
import { institutional_context, UserGroups } from '../constants.js';


const auth = { auth: { api_key: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN } }
const nodemailerMailgun = nodemailer.createTransport(mailgunTransport(auth))

const testTransport = null
// const testTransport = process.env.DEBUGMAIL_LOGIN ?
//   nodemailer.createTransport(smtpTransport({
//     host: 'debugmail.io',
//     port: 25,
//     auth: { user: process.env.DEBUGMAIL_LOGIN, pass: process.env.DEBUGMAIL_PASSWORD }
//   }))
//   : null

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
      `Bienvenido al colectivo ${groupRequest} @alicialonso.org`,
      `Por favor usa el siguiente vínculo: ${process.env.APP_HOST} para iniciar sesión en tu cuenta y acceder al nuevo contenido.`,
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

export const sendBetaWelcome = async (to) => {
  const res = await sendEmail(
      to,
      'Bienvenido a la fase de prueba aaXapp de la Fundación Alicia Alonso',
      `¡Alicia Alonso se vuelve digital!

      Hemos comenzado nuestra andadura hacia la transformación digital de la organización y nos gustaría que formaras parte de ella; por lo que te damos la bienvenida a la fase de prueba abierta de nuestra nueva aplicación para dispositivos móviles aaXapp, diseñada para convertirse en la vía oficial de comunicación de nuestra organización a través de la cual podrás disfrutar de contenido relevante para tu experiencia en la misma.
      Agradecemos tu participación activa en esta fase para alcanzar un lanzamiento exitoso lo antes posible y comenzar a disfrutar de los beneficios que propone, para ello tan solo debes seguir los vínculos a continuación según el dispositivo que poseas y una vez que tengas la aplicación instalada deberás registrar tu nueva cuenta en la sección Perfil. A partir de entonces esta será tu cuenta oficial en alicialonso.org y a través de ella podrás comenzar a disfrutar de todos los servicios digitales que ofreceremos!
      
      iOS: https://testflight.apple.com/join/l6QED8GJ
      android: https://play.google.com/apps/testing/com.evel.aaxapp
      

      Si no desea recibir más notificaciones de alicialonso.org por favor responda a este mismo email.`,
      `templates/betatestwelcome.hbs`,
      { link: process.env.APP_HOST, email:to }
  )
}