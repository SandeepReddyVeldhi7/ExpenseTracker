import connectDB from "@/pages/api/lib/mongoose";
import Attendance from "@/pages/api/models/Attendance";
import Webinar from "../../models/Zoom-Classes";
import ZoomClasses from "../../models/Zoom-Classes";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  console.log("Received Zoom webhook body:", JSON.stringify(req.body, null, 2));
  const event = req.body.event;
  console.log("event", event);
  if (!event) {
    return res.status(400).json({ message: "Missing event in request body" });
  }
  if (event === "endpoint.url_validation") {
    try {
      console.log("Handling endpoint.url_validation event");
      const plainToken = req.body?.payload?.plainToken;
      console.log("req.body?.payload", req.body?.payload);
      console.log("plainToken", plainToken);
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

  await connectDB();

  if (event === "meeting.participant_joined") {
    const participant = req.body.payload.object.participant;
    const meetingId = req.body.payload.object.id;
    const hostId = req.body.payload.object.host_id;

    //  Determine type from DB
    const typeOfMeeting = await ZoomClasses.findOne({ meetingId });
    const type = typeOfMeeting?.type;
    // Determine role:
    const role = participant.id === hostId ? "host" : "participant";

    console.log(
      ` Participant joined: ${participant.user_name} (${participant.email}) for meeting ${meetingId}`
    );

    //  Safe pattern: find first, then create or push
    let attendance = await Attendance.findOne({
      meetingId,
      participant_name: participant.user_name,
    });

    if (!attendance) {
      attendance = await Attendance.create({
        meetingId,
        participant_name: participant.user_name,
        participant_email: participant.email,
        role,
        type,
        sessions: [{ joined_at: new Date() }],
      });
    } else {
      attendance.sessions.push({ joined_at: new Date() });
      await attendance.save();
    }

    console.log(` Upserted attendance record: ${JSON.stringify(attendance)}`);
    return res.status(200).json({ received: true });
  } else if (event === "meeting.participant_left") {
    const participant = req.body.payload.object.participant;
    const meetingId = req.body.payload.object.id;

    console.log(
      `Participant left: ${participant.user_name} (${participant.email}) for meeting ${meetingId}`
    );

    // Find document
    const attendance = await Attendance.findOne({
      meetingId,
      participant_name: participant.user_name,
    });

    if (attendance) {
      // Find the last open session
      const index = attendance.sessions
        ?.map((s) => s.left_at)
        ?.lastIndexOf(undefined);

      if (index !== -1) {
        const now = new Date();
        const joinedAt = attendance.sessions[index].joined_at;

        attendance.sessions[index].left_at = now;

        //  Compute duration in MINUTES
        const durationMinutes = Math.round((now - joinedAt) / (1000 * 60));
        attendance.sessions[index].duration = durationMinutes;

        await attendance.save();
        console.log(
          ` Closed session ${index} with duration ${durationMinutes} mins`
        );
      } else {
        console.log(` No open session found to close.`);
      }
    } else {
      console.log(` No attendance record found for left event.`);
    }

    return res.status(200).json({ received: true });
  } else if (event === "meeting.ended") {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const meetingId = req.body.payload.object.id;
    console.log(`🛑 Meeting ended: ${meetingId}`);

    const records = await Attendance.find({ meetingId });
    const now = new Date();

    for (const record of records) {
      let changed = false;

      // Close open sessions
      record.sessions.forEach((session) => {
        if (!session.left_at) {
          session.left_at = now;
          session.duration = Math.round((now - session.joined_at) / 1000);
          changed = true;
        }
      });

      // Compute total duration
      record.total_duration = record.sessions.reduce(
        (sum, s) => sum + (s.duration || 0),
        0
      );

      // Call OpenAI to generate summary
      const sessionCount = record.sessions.length;
      const totalSecs = record.total_duration;
      const prompt = `Write a clear attendance summary for ${record.participant_name}. 
    They attended ${totalSecs} seconds in ${sessionCount} sessions.`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful meeting assistant. Write a friendly, short attendance summary.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      record.summary = aiResponse.choices[0].message.content;

      if (
        changed ||
        record.isModified("total_duration") ||
        record.isModified("summary")
      ) {
        await record.save();
        console.log(
          `Closed open sessions, total duration, and saved AI summary for ${record.participant_name}`
        );
      }
    }
    const zoom = await ZoomClasses.findOne({ meetingId });
    if (zoom) {
      zoom.status = "completed";
      await zoom.save();
      console.log(`Marked webinar ${zoom._id} as complete`);
    } else {
      console.log(`⚠️ No webinar found with meetingId ${meetingId}`);
    }

    return res.status(200).json({ received: true });
  } else {
    console.warn(`⚠️ Unhandled event type: ${event}`);
    return res.status(400).json({ message: "Unhandled event", event });
  }
}
