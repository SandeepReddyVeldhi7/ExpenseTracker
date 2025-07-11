export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  console.log("✅ Received request:", {
    method: req.method,
    body: req.body
  });

  if (req.method !== "POST") {
    console.warn("⚠️ Method Not Allowed:", req.method);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const event = req.body?.event;
  console.log("✅ Extracted event:", event);

  if (!event) {
    console.error("❌ Missing event in request body!");
    return res.status(400).json({ message: "Missing event in request body" });
  }

  if (event === "endpoint.url_validation") {
    try {
      console.log("✨ Handling endpoint.url_validation");

      const plainToken = req.body?.payload?.plainToken;
      console.log("✅ Extracted plainToken:", plainToken);

      if (!plainToken) {
        console.error("❌ Missing plainToken in payload!");
        return res
          .status(400)
          .json({ message: "Missing plainToken in payload" });
      }
 console.log("✅ Using Verification Token from env:", process.env.ZOOM_VERIFICATION_TOKEN);
      const crypto = await import("crypto");
      const hmac = crypto.createHmac(
        "sha256",
        process.env.ZOOM_VERIFICATION_TOKEN
      );
      hmac.update(plainToken);
      const encryptedToken = hmac.digest("hex");

      console.log("✅ Computed encryptedToken:", encryptedToken);

      const response = {
        plainToken,
        encryptedToken,
      };

      console.log("✅ Responding with:", response);

      return res.status(200).json(response);
    } catch (error) {
      console.error("❌ Error handling url_validation:", error);
      return res.status(500).json({ error: "Server error during validation" });
    }
  }

  console.warn("⚠️ Unhandled event type:", event);
  return res.status(400).json({ message: "Unhandled event", event });
}
