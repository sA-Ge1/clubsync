import { NextRequest, NextResponse } from "next/server";
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
    if (req.method !== "POST") {
        return NextResponse.json(
            { message: "Only POST allowed." },
            { status: 405 }
        );
    }
    
    try {
        const { name, phno, email, subject, message } = await req.json();

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            },
        });

        // Create HTML email template
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New message from Report-Gen</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }
                .container {
                    background-color: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                .header {
                    border-bottom: 2px solid #e9ecef;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #495057;
                    margin: 0;
                    font-size: 24px;
                }
                .field {
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #f8f9fa;
                    border-radius: 6px;
                    border-left: 4px solid #007bff;
                }
                .field-label {
                    font-weight: 600;
                    color: #495057;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                    font-size: 12px;
                    letter-spacing: 0.5px;
                }
                .field-value {
                    color: #212529;
                    font-size: 16px;
                }
                .message-field {
                    background-color: #fff;
                    border: 1px solid #dee2e6;
                    padding: 20px;
                    border-radius: 6px;
                    white-space: pre-wrap;
                    min-height: 100px;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                    text-align: center;
                    color: #6c757d;
                    font-size: 14px;
                }
                .timestamp {
                    background-color: #e9ecef;
                    padding: 10px;
                    border-radius: 4px;
                    text-align: center;
                    margin-bottom: 20px;
                    font-size: 14px;
                    color: #6c757d;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New message from Report-Gen</h1>
                </div>
                
                <div class="timestamp">
                    Received on ${new Date().toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                    })}
                </div>

                <div class="field">
                    <div class="field-label">Name</div>
                    <div class="field-value">${name}</div>
                </div>

                <div class="field">
                    <div class="field-label">Email Address</div>
                    <div class="field-value">
                        <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a>
                    </div>
                </div>

                ${phno ? `
                <div class="field">
                    <div class="field-label">Phone Number</div>
                    <div class="field-value">
                        <a href="tel:${phno}" style="color: #007bff; text-decoration: none;">${phno}</a>
                    </div>
                </div>
                ` : ''}

                <div class="field">
                    <div class="field-label">Subject</div>
                    <div class="field-value">${subject}</div>
                </div>

                <div class="field">
                    <div class="field-label">Message</div>
                    <div class="message-field">${message}</div>
                </div>

                <div class="footer">
                    <p>This message was sent from the ReportGen contact form.</p>
                    <p>Please respond directly to the sender's email address: <strong>${email}</strong></p>
                </div>
            </div>
        </body>
        </html>
        `;

        // Plain text version for email clients that don't support HTML
        const textContent = `
NEW CONTACT FORM SUBMISSION
============================

Received: ${new Date().toLocaleString()}

Name: ${name}
Email: ${email}
${phno ? `Phone: ${phno}` : ''}
Subject: ${subject}

Message:
${message}

---
This message was sent from the ReportGen contact form.
Please respond directly to: ${email}
        `;

        await transporter.sendMail({
            from: process.env.EMAIL, // Use your own email as sender
            to: "adityakarumbaiah@gmail.com",
            replyTo: email, // Allow direct reply to the sender
            subject: `Contact Form: ${subject} - ${name}`,
            text: textContent,
            html: htmlContent
        });

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('Email sending error:', err);
        return NextResponse.json(
            { message: "Failed to send email" },
            { status: 500 }
        );
    }
}