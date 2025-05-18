import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Configure the transporter only once
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.WEBSITE_EMAIL,
        pass: process.env.WEBSITE_EMAIL_PASSWORD,
    },
});

// Welcome Email HTML Content
const welcomeEmailContent = `
<div style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #f97316;">Welcome to FlyExpress!</h2>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p>Hello,</p>
    <p>Thank you for joining FlyExpress. You’re all set to explore great deals and plan your next trip with ease.</p>
    
    <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background-color: #f9f9f9; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #202124;">Here’s what you can do:</h3>
        <ul style="padding-left: 20px; color: #555;">
            <li>📅 Find the best prices with our <strong>Price Calendar</strong>.</li>
            <li>❤️ Save flights to your personal Favorites list.</li>
            <li>✈️ Discover popular destinations and hidden gems.</li>
        </ul>
    </div>

    <p>Log in now and start planning your next adventure!</p>
    <a href="http://localhost:3000/login" style="display: inline-block; margin-top: 20px; padding: 12px 24px; 
        background-color: #f97316; color: #fff; text-decoration: none; border-radius: 8px;">
        Go to FlyExpress
    </a>

    <p style="margin-top: 40px;">Fly safe,<br>The FlyExpress Team ✈️</p>
</div>
`;

// Exported sendMail function
export function sendWelcomeEmail(toEmail) {
    const mailOptions = {
        from: process.env.WEBSITE_EMAIL,
        to: toEmail,
        subject: 'Welcome to FlyExpress! ✈️',
        html: welcomeEmailContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending welcome email:', error);
        } else {
            console.log('Welcome email sent:', info.response);
        }
    });
}
