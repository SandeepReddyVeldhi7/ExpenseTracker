export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const event = req.body.event;
  if (!event) {
    return res.status(400).json({ message: "Missing event in request body" });
  }

  if (event === "endpoint.url_validation") {
    try {
      const plainToken = req.body?.payload?.plainToken;
      if (!plainToken) {
        return res
          .status(400)
          .json({ message: "Missing plainToken in payload" });
      }

      const crypto = await import("crypto");
      const hmac = crypto.createHmac(
        "sha256",
        process.env.ZOOM_VERIFICATION_TOKEN
      );
      hmac.update(plainToken);
      const encryptedToken = hmac.digest("hex");

      return res.status(200).json({
        plainToken,
        encryptedToken,
      });
    } catch (error) {
      console.error("Error handling url_validation", error);
      return res.status(500).json({ error: "Server error during validation" });
    }
  }

  return res.status(400).json({ message: "Unhandled event" });
}
