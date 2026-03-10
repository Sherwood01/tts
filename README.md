# TTS Demo

A simple web demo for text-to-speech with file upload.

## Run locally

```powershell
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

## Deploy to Vercel

1. Create a Vercel project from this folder.
2. Set environment variables (see `.env.example`):
   - `AZURE_SPEECH_KEY`: Azure Speech key
   - `AZURE_SPEECH_REGION`: Azure Speech region (e.g. `eastus`)
3. Deploy. The demo will call `/api/tts` by default.

## Notes

- `.docx` is supported via the browser using mammoth.
- `.doc` is not supported in-browser; convert to `.docx` for this demo.
- Browser TTS plays audio but cannot download.
- Model TTS uses Azure Speech via `/api/tts`.
