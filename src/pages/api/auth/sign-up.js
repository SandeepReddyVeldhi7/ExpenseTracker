  import { connectDB } from "@/lib/db";
  import {User} from "@/models/User";
  import bcrypt from 'bcryptjs'

  export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
      // Connect to the database
      await connectDB();

      // Destructure the request body
      const { username, email, password, confirmPassword, role } = req.body;

      


      // Input validation
      if (!username || !email || !password || !confirmPassword || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      // Check if the email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }


      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword, // Store the hashed password
        role,
      });

      // Return success response
      return res.status(201).json({ message: "User stored successfully", userId: newUser._id });
    } catch (error) {
      console.error("Internal Server Error: ", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }