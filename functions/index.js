const functions = require('firebase-functions')
const nodemailer = require('nodemailer')
const cors = require('cors')({ origin: true })
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Función original de contacto - se mantiene sin cambios
exports.sendContactEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed')
    }

    const { name, email, phone, subject, message } = req.body

    const mailOptions = {
      from: '"Mensaje de la web" <' + process.env.EMAIL_USER + '>',
      to: 'patronatfestesroquetes@gmail.com',
      subject: subject || 'Nuevo mensaje de contacto',
      text: `
    Nombre del usuario: ${name}
    Email del usuario: ${email}
    Teléfono del usuario: ${phone}
    Asunto del usuario: ${subject}
    Mensaje del usuario: ${message}
  `,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      <h2 style="color: #2c3e50;">📬 Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
      <p><strong>Asunto:</strong> ${subject || 'Sin asunto'}</p>
      <p><strong>Mensaje:</strong></p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
        <p style="white-space: pre-line; margin: 0;">${message}</p>
      </div>
      <hr style="margin-top: 20px;">
      <p style="font-size: 12px; color: #888;">Este mensaje fue enviado desde el formulario de contacto del sitio web.</p>
    </div>
  `,
    }

    try {
      await transporter.sendMail(mailOptions)
      return res.status(200).send({ success: true })
    } catch (error) {
      console.error('Error al enviar el correo:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

// Nueva función para envío de correos masivos
exports.sendBulkEmails = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed')
    }

    const { recipientType, recipients, subject, message } = req.body

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).send({
        success: false,
        error: 'Se requiere una lista válida de destinatarios',
      })
    }

    if (!subject || !message) {
      return res.status(400).send({
        success: false,
        error: 'Se requiere asunto y mensaje',
      })
    }

    // Preparamos los destinatarios para BCC (copia oculta)
    const bccEmails = recipients
      .map((r) => `"${r.name}" <${r.email}>`)
      .join(', ')

    // Título según el tipo de destinatario
    const recipientTitle =
      recipientType === 'partners' ? 'Socios' : 'Responsables de Peñas'

    const mailOptions = {
      from: '"Patronat de Festes Roquetes" <' + process.env.EMAIL_USER + '>',
      to: process.env.EMAIL_USER,
      bcc: bccEmails,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
          <h2 style="color: #2c3e50;">${subject}</h2>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
            <p style="white-space: pre-line; margin: 0;">${message}</p>
          </div>
          <hr style="margin-top: 20px;">
          <p style="font-size: 12px; color: #888;">Este es un mensaje del Patronat de Festes de Roquetes para ${recipientTitle}.</p>
        </div>
      `,
    }

    try {
      // Agregamos un registro de control
      console.log(
        `Enviando correo masivo a ${recipients.length} destinatarios del tipo ${recipientType}`
      )

      await transporter.sendMail(mailOptions)

      // Registramos el éxito
      console.log(
        `Correo enviado con éxito a ${recipients.length} destinatarios`
      )

      return res.status(200).send({
        success: true,
        message: `Correo enviado con éxito a ${recipients.length} destinatarios`,
      })
    } catch (error) {
      console.error('Error al enviar correos masivos:', error)
      return res.status(500).send({
        success: false,
        error: error.message,
      })
    }
  })
})
