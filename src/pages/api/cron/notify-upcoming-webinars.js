
import { connectDB } from "@/lib/db";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  console.log("\n🟢 [Cron] === SEND SIMPLE TEST EMAIL - START ===\n");

  // 1️⃣ Verify cron secret
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    console.error("❌ Invalid Cron Secret");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 2️⃣ Check method
  if (req.method !== "GET") {
    console.error("❌ Method Not Allowed:", req.method);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // 3️⃣ Connect to DB (if needed)
  try {
    await connectDB();
    console.log("✅ Connected to DB");
  } catch (err) {
    console.error("❌ Error connecting to DB:", err);
  }

  // 4️⃣ Create transporter
  console.log("✅ [Email] Creating transporter with config:");
  console.log({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    from: process.env.EMAIL_FROM
  });

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 5️⃣ Hard-coded email content
  const recipient = "veldhisandeepreddy@gmail.com"; // Change to your test email
  const subject = "Test Email from Production";
  const emailBody = `
Hello,

This is a test email from production.
reddy cronjobs
Please ignore.

Thank you,
The Team
  `;

  console.log("\n🟢 [Email] Attempting to send email");
  console.log(`   ➜ To: ${recipient}`);
  console.log(`   ➜ Subject: ${subject}`);
  console.log(`   ➜ Body: ${emailBody}`);

  // 6️⃣ Send email
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipient,
      subject,
      text: emailBody,
    });

    console.log("✅ [Email] Message sent successfully");
    console.log(`   ➜ Message ID: ${info.messageId}`);

    return res.status(200).json({ message: "Test email sent successfully" });
  } catch (err) {
    console.error("❌ [Email] Error sending email:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
