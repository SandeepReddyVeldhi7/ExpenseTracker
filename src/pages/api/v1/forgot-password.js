import crypto from "crypto";
import nodemailer from "nodemailer";
import { User } from "@/models/User";
import dashboardUsers from "@/models/dashboardUsers";
import { connectDB } from "@/lib/db";

async function sendVerificationEmail(adminEmail, token) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("EMAIL_USER or EMAIL_PASS not configured. Skipping email dispatch.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const baseUrl = process.env.BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: "Reset your password for ExpenseTracker",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #000; border-radius: 8px;">
        <h2 style="color: #000;">Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to set a new password. This link is valid for 1 hour.</p>
        <p style="margin: 24px 0;">
          <a href="${baseUrl}/reset-password-verification?token=${token}" 
             style="background-color: #D4FF00; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border: 2px solid #000; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await connectDB();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await dashboardUsers.findOne({ email: normalizedEmail });
    }

    if (user) {
      const verificationToken = crypto.randomBytes(32).toString("hex");

      user.forgotPasswordToken = verificationToken;
      user.forgotPasswordExpires = new Date(Date.now() + 3600000); // 1 hour TTL
      await user.save();

      try {
        await sendVerificationEmail(user.email, verificationToken);
      } catch (mailErr) {
        console.error("Failed to send reset email:", mailErr);
      }
    }

    // Always return success to prevent email enumeration
    return res.status(200).json({
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
