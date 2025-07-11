export default async function handler(req, res) {
    res.status(200).json({ message: "Zoom webhook received" }); // ✅ only needed fields
}