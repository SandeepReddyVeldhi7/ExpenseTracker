import crypto from "crypto";
import nodemailer from "nodemailer";
import { User } from "@/pages/models/User";
import dashboardUsers from "@/pages/models/dashboardUsers";
import { connectDB } from "@/pages/lib/db";


async function sendVerificationEmail(adminEmail, token) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: "Verify your password for Conscion Estates",
    html: `
      <h1>Password Reset</h1>
      <p>Click below to reset your password:</p>
      <a href="${process.env.BASE_URL}/reset-password-verification?token=${token}">Reset Password</a>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

await connectDB();
  const { email } = req.body;
console.log("trigering...................")
  console.log("email:::::::",email)
  let user = await User.findOne({ email });
  let userType = "owner";

  if (!user) {
    user = await dashboardUsers.findOne({ email });
    userType = "staff";
  }

  if (user) {
    const VerificationToken = crypto.randomBytes(32).toString("hex");

    user.forgotPasswordToken = VerificationToken;
    await user.save();

    await sendVerificationEmail(user.email, VerificationToken);

    return res.status(200).json({
      message: "Password reset link sent successfully",
      userType, // Optional: for debugging
    });
  } else {
    return res.status(404).json({ message: "User not found" });
  }
}
