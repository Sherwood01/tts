export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const url = "https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/language-support?tabs=tts";
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "tts-demo",
      },
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status).send(errText);
      return;
    }

    const html = await upstream.text();

    // Extract voice names like en-US-EmmaNeural, zh-CN-Xiaoxiao:DragonHDLatestNeural, etc.
    const regex = /\b([a-z]{2,3}-[A-Z]{2,3})(?:[-:])([A-Za-z0-9]+(?:[A-Za-z0-9]+)?(?:Neural|MultilingualNeural|DragonHDLatestNeural|DragonHDFlashLatestNeural|DragonHDOmniLatestNeural|TurboMultilingualNeural|AIGenerate\d+Neural|IndicNeural)\b)/g;
    const matches = new Set();

    let m;
    while ((m = regex.exec(html)) !== null) {
      const locale = m[1];
      const rest = m[2];
      const name = `${locale}-${rest}`;
      matches.add(name);
    }

    // Map to the same shape as Azure voices/list
    const data = Array.from(matches).map((name) => {
      const locale = name.split("-").slice(0, 2).join("-");
      return {
        Name: name,
        ShortName: name,
        Locale: locale,
        LocaleName: locale,
        Gender: "",
      };
    });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
}
