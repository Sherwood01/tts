# TTS Demo

A simple web demo for text-to-speech with file upload.

## Run locally

```powershell
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

## Deploy to Vercel

1. Create a Vercel project from this folder.
2. Set environment variables:
   - `TTS_ENDPOINT`: your upstream TTS HTTP endpoint
   - `TTS_API_KEY`: optional bearer token
3. Deploy. The demo will call `/api/tts` by default.

## Notes

- `.docx` is supported via the browser using mammoth.
- `.doc` is not supported in-browser; convert to `.docx` for this demo.
- Browser TTS plays audio but cannot download.
- Model TTS uses `/api/tts` serverless function on Vercel and expects upstream JSON:

```json
{
  "text": "hello",
  "voice": "voice-name",
  "format": "mp3"
}
```

The upstream can return an audio blob or JSON:

```json
{
  "audio_base64": "...",
  "content_type": "audio/mpeg"
}
```
