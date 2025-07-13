import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse multipart/form-data
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable();
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = files.image;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Get the image buffer
    const imagePath = Array.isArray(file) ? file[0].filepath : file.filepath;
    const imageBuffer = fs.readFileSync(imagePath);

    // Your Azure credentials
    const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
    const AZURE_KEY = process.env.AZURE_KEY;

    // 1️⃣ Submit image to Azure Read API
    const submitRes = await fetch(
      `${AZURE_ENDPOINT}/vision/v3.2/read/analyze`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_KEY,
          "Content-Type": "application/octet-stream",
        },
        body: imageBuffer,
      }
    );

    if (!submitRes.ok) {
      const error = await submitRes.text();
      return res.status(400).json({ error });
    }

    const operationLocation = submitRes.headers.get("operation-location");

    // 2️⃣ Poll for the result
    let result;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1500));

      const statusRes = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": AZURE_KEY },
      });
      const json = await statusRes.json();

      if (json.status === "succeeded") {
        result = json.analyzeResult.readResults;
        break;
      }
      if (json.status === "failed") {
        throw new Error("Azure Read failed.");
      }
    }

    if (!result) {
      return res.status(408).json({ error: "Timeout waiting for Azure." });
    }

    // 3️⃣ Extract text lines
    const lines = result
      .flatMap((page) => page.lines.map((l) => l.text))
      .filter(Boolean);

    return res.status(200).json({ lines });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
