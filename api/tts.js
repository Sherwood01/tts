export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { text, voice, format } = req.body || {};
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing text" });
      return;
    }

    const endpoint = process.env.TTS_ENDPOINT;
    const apiKey = process.env.TTS_API_KEY;
    if (!endpoint) {
      res.status(500).json({ error: "TTS_ENDPOINT not configured" });
      return;
    }

    const payload = {
      text,
      voice: voice || "default",
      format: format || "mp3",
    };

    const headers = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).send(errText);
      return;
    }

    const contentType = upstream.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const data = await upstream.json();
      if (!data.audio_base64) {
        res.status(502).json({ error: "Missing audio_base64 from upstream" });
        return;
      }
      const buffer = Buffer.from(data.audio_base64, "base64");
      res.setHeader("Content-Type", data.content_type || "audio/mpeg");
      res.setHeader("Content-Disposition", "attachment; filename=tts.mp3");
      res.status(200).send(buffer);
      return;
    }

    const arrayBuffer = await upstream.arrayBuffer();
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=tts.mp3");
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
}
