import '@babel/polyfill/noConflict'
import server from './server'
import express from 'express'
import Mailgun from 'mailgun-js'

server.start({ port: process.env.PORT || 4000 }, () => { console.log('Server up and running!') })

/*
const mailgun = require('mailgun-js')({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});
var data = {
	from: 'Fundación Alicia Alonso <fundacion@alicialonso.org>',
	to: 'bar@example.com, enrique.prez.velasco@gmail.com',
	subject: 'Hello',
	text: 'Testing some Mailgun awesomness!'
}
mailgun.messages().send( data, (error, body) => console.log(body) )
*/

/*
const app = express();
app.use(express.static(__dirname + '/mail/js'))

//Do something when you're landing on the first page
app.get('/', (req, res) => {
    //render the index.jade file - input forms for humans
    res.render('index', (err, html) => {
        if (err) console.log(err)
        else res.send(html)
    })
})

// Send a message to the specified email address when you navigate to /submit/someaddr@email.com
// The index redirects here
app.get('/submit/:mail', (req,res) => {
    var mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});
    var data = {
      from: from_who, //Specify email data
      to: req.params.mail, //The email to contact
      subject: 'Hello from Mailgun', //Subject and text data
      html: 'Hello, This is not a plain-text email, I wanted to test some spicy Mailgun sauce in NodeJS! <a href="http://0.0.0.0:3030/validate?' + req.params.mail + '">Click here to add your email address to a mailing list</a>'
    }
    //Invokes the method to send emails given the above data with the helper library
    mailgun.messages().send(data, (err, body) => {
        if (err) { //If there is an error, render the error page
            res.render('error', { error : err})
            console.log("got an error: ", err)
        }
        else { //Else we can greet    and leave
            //Here "submitted.jade" is the view file for this landing page
            //We pass the variable "email" from the url parameter in an object rendered by Jade
            res.render('submitted', { email : req.params.mail })
            console.log(body)
        }
    })
})
app.get('/validate/:mail', function(req,res) {
    var mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});
    var members = [ { address: req.params.mail } ];
//For the sake of this tutorial you need to create a mailing list on Mailgun.com/cp/lists and put its address below
    mailgun.lists('aaxusers@mail.alicialonso.org').members().add({ members: members, subscribed: true }, (err, body) => {
      console.log(body)
      if (err) res.send("Error - check console")
      else res.send("Added to mailing list")
    })
})
app.get('/invoice/:mail', function(req,res){
    //Which file to send? I made an empty invoice.txt file in the root directory
    //We required the path module here..to find the full path to attach the file!
    import path from 'path'
    let fp = path.join(__dirname, 'mail/attachments/invoice.txt');
    //Settings
    let mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});
    let data = {
      from: from_who,
      to: req.params.mail,
      subject: 'An invoice from your friendly hackers',
      text: 'A fake invoice should be attached, it is just an empty text file after all',
      attachment: fp
    }
    //Sending the email with attachment
    mailgun.messages().send(data, (error, body) => {
        if (error) {
            res.render('error', {error: error})
        }
            else {
            res.send("Attachment is on its way")
            console.log("attachment sent", fp)
            }
        });
})
app.listen(3030);
*/
