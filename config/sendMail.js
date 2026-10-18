import { createTransport } from "nodemailer";


const sendMail = async({to, subject , html})=>{

    console.log("Preparing to send email to:", to);
    const transporter = createTransport({
        host: "smtp.gmail.com",
        port: 465,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    await transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to,
        subject,
        html
    });
}

export {sendMail};