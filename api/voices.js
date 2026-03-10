export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region) {
      res.status(500).json({ error: "AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not configured" });
      return;
    }

    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
    const upstream = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "User-Agent": "tts-demo",
      },
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).send(errText);
      return;
    }

    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
}
