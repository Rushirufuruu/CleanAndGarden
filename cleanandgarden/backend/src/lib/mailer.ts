import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // define en .env
    pass: process.env.EMAIL_PASS, // define en .env (app password)
  },
  tls: {
    rejectUnauthorized: false, // Permite certificados auto-firmados
  },
});
