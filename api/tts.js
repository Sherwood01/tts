function escapeXml(input) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mapOutputFormat(format) {
  const key = (format || "mp3").toLowerCase();
  if (key === "wav") return "riff-24khz-16bit-mono-pcm";
  if (key === "ogg") return "ogg-24khz-16bit-mono-opus";
  return "audio-24khz-48kbitrate-mono-mp3";
}

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

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region) {
      res.status(500).json({ error: "AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not configured" });
      return;
    }

    const outputFormat = mapOutputFormat(format);
    const voiceName = (voice || "zh-CN-XiaoxiaoNeural").trim();
    const ssml = `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xml:lang="zh-CN">
  <voice name="${voiceName}">${escapeXml(text)}</voice>
</speak>`;

    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": outputFormat,
        "Ocp-Apim-Subscription-Key": key,
        "User-Agent": "tts-demo",
      },
      body: ssml,
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).send(errText);
      return;
    }

    const contentType = upstream.headers.get("Content-Type") || "audio/mpeg";
    const arrayBuffer = await upstream.arrayBuffer();
    const filename = `tts.${(format || "mp3").toLowerCase()}`;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
}