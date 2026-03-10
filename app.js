const fileInput = document.getElementById("fileInput");
const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const fileNote = document.getElementById("fileNote");
const engineSelect = document.getElementById("engineSelect");
const voiceSelect = document.getElementById("voiceSelect");
const refreshVoicesBtn = document.getElementById("refreshVoicesBtn");
const rateInput = document.getElementById("rateInput");
const azureVoiceSelect = document.getElementById("azureVoiceSelect");
const formatSelect = document.getElementById("formatSelect");
const modelConfig = document.getElementById("modelConfig");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const audioPlayer = document.getElementById("audioPlayer");
const downloadLink = document.getElementById("downloadLink");
const clearBtn = document.getElementById("clearBtn");

let voices = [];
let activeUtterance = null;
let voicesLoaded = false;

let azureVoices = [
  { name: "zh-CN-XiaoxiaoNeural", label: "\u4e2d\u6587(\u666e\u901a\u8bdd) - Xiaoxiao" },
  { name: "zh-CN-YunxiNeural", label: "\u4e2d\u6587(\u666e\u901a\u8bdd) - Yunxi" },
  { name: "zh-CN-YunjianNeural", label: "\u4e2d\u6587(\u666e\u901a\u8bdd) - Yunjian" },
  { name: "zh-CN-XiaoyiNeural", label: "\u4e2d\u6587(\u666e\u901a\u8bdd) - Xiaoyi" },
  { name: "zh-CN-YunyangNeural", label: "\u4e2d\u6587(\u666e\u901a\u8bdd) - Yunyang" },
  { name: "zh-HK-HiuGaaiNeural", label: "\u4e2d\u6587(\u7ca4\u8bed) - HiuGaai" },
  { name: "zh-HK-WanLungNeural", label: "\u4e2d\u6587(\u7ca4\u8bed) - WanLung" },
  { name: "zh-TW-HsiaoChenNeural", label: "\u4e2d\u6587(\u53f0\u6e7e) - HsiaoChen" },
  { name: "zh-TW-YunJheNeural", label: "\u4e2d\u6587(\u53f0\u6e7e) - YunJhe" },
  { name: "en-US-JennyNeural", label: "English(US) - Jenny" },
  { name: "en-US-GuyNeural", label: "English(US) - Guy" }
];

function populateAzureVoices() {
  if (!azureVoiceSelect) return;
  azureVoiceSelect.innerHTML = "";
  azureVoices.forEach((voice) => {
    const opt = document.createElement("option");
    opt.value = voice.name;
    opt.textContent = voice.label;
    if (voice.name === "zh-CN-XiaoxiaoNeural") {
      opt.selected = true;
    }
    azureVoiceSelect.appendChild(opt);
  });
}

function setStatus(message) {
  statusEl.textContent = message;
}

function updateCharCount() {
  charCount.textContent = textInput.value.length.toString();
}

function setDownload(blob, filename) {
  if (!blob) {
    downloadLink.classList.add("disabled");
    downloadLink.href = "#";
    return;
  }
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = filename;
}

function resetAudio() {
  audioPlayer.pause();
  audioPlayer.removeAttribute("src");
  audioPlayer.load();
  setDownload(null);
}

function updateEngineUI() {
  const engine = engineSelect.value;
  modelConfig.style.display = engine === "model" ? "block" : "none";
  generateBtn.textContent = "\u751f\u6210\u8bed\u97f3";
}

function refreshVoices() {
  populateVoices();
  setTimeout(populateVoices, 500);
  setTimeout(populateVoices, 1500);
}

function populateVoices() {
  voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  voiceSelect.innerHTML = "";
  if (!voices.length) {
    const opt = document.createElement("option");
    opt.value = "default";
    opt.textContent = "\u6d4f\u89c8\u5668\u8bed\u97f3\u4e0d\u53ef\u7528";
    voiceSelect.appendChild(opt);
    voiceSelect.disabled = true;
    return;
  }
  voicesLoaded = true;
  voiceSelect.disabled = false;
  voices.forEach((voice) => {
    const opt = document.createElement("option");
    opt.value = voice.name;
    opt.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(opt);
  });
}

function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
}

async function readFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  fileNote.textContent = `\u5df2\u52a0\u8f7d: ${file.name}`;
  if (ext === "txt") {
    return await file.text();
  }
  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }
  if (ext === "doc") {
    throw new Error("\u6d4f\u89c8\u5668\u7aef\u6682\u4e0d\u652f\u6301 .doc\uff0c\u8bf7\u5148\u8f6c\u6362\u4e3a .docx");
  }
  throw new Error("\u4e0d\u652f\u6301\u7684\u6587\u4ef6\u7c7b\u578b");
}

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await readFile(file);
    textInput.value = text.trim();
    updateCharCount();
    setStatus("\u6587\u4ef6\u5df2\u5bfc\u5165");
  } catch (err) {
    setStatus(err.message);
  }
});

textInput.addEventListener("input", updateCharCount);

clearBtn.addEventListener("click", () => {
  fileInput.value = "";
  textInput.value = "";
  fileNote.textContent = "";
  updateCharCount();
  resetAudio();
  setStatus("\u5df2\u6e05\u7a7a");
});

engineSelect.addEventListener("change", updateEngineUI);

playBtn.addEventListener("click", () => {
  if (!window.speechSynthesis) {
    setStatus("\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u8bed\u97f3\u5408\u6210");
    return;
  }
  const text = textInput.value.trim();
  if (!text) {
    setStatus("\u8bf7\u5148\u8f93\u5165\u6587\u672c");
    return;
  }
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = voices.find((v) => v.name === voiceSelect.value);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = Number(rateInput.value);
  utterance.onstart = () => setStatus("\u6b63\u5728\u64ad\u653e\u6d4f\u89c8\u5668\u8bed\u97f3");
  utterance.onend = () => setStatus("\u64ad\u653e\u7ed3\u675f");
  utterance.onerror = () => setStatus("\u64ad\u653e\u5931\u8d25");
  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
});

stopBtn.addEventListener("click", () => {
  stopSpeech();
  setStatus("\u5df2\u505c\u6b62");
});

refreshVoicesBtn.addEventListener("click", () => {
  refreshVoices();
  if (!voicesLoaded) {
    setStatus("\u5df2\u5237\u65b0\u8bed\u97f3\u5217\u8868\uff0c\u5982\u4ecd\u4e3a\u7a7a\u8bf7\u5728 https \u73af\u5883\u4e0b\u6253\u5f00");
  }
});

document.addEventListener(
  "click",
  () => {
    if (!voicesLoaded) {
      refreshVoices();
    }
  },
  { once: true }
);

async function callModelTTS(text) {
  const payload = {
    text,
    voice: azureVoiceSelect.value || "zh-CN-XiaoxiaoNeural",
    format: formatSelect.value,
  };

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const textErr = await res.text();
    throw new Error(`\u8bf7\u6c42\u5931\u8d25: ${res.status} ${textErr}`);
  }

  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (data.audio_base64) {
      const byteString = atob(data.audio_base64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      return new Blob([bytes], { type: data.content_type || "audio/mpeg" });
    }
    throw new Error("\u8fd4\u56de\u7684 JSON \u7f3a\u5c11 audio_base64 \u5b57\u6bb5");
  }

  return await res.blob();
}

generateBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("\u8bf7\u5148\u8f93\u5165\u6587\u672c");
    return;
  }

  resetAudio();

  const engine = engineSelect.value;
  if (engine === "browser") {
    setStatus("\u6d4f\u89c8\u5668\u8bed\u97f3\u53ea\u652f\u6301\u64ad\u653e\uff0c\u4e0d\u652f\u6301\u4e0b\u8f7d\uff0c\u8bf7\u6539\u7528\u5927\u6a21\u578b\u5f15\u64ce");
    return;
  }

  try {
    setStatus("\u6b63\u5728\u751f\u6210\u8bed\u97f3...");
    const blob = await callModelTTS(text);
    const filename = `tts.${formatSelect.value}`;
    audioPlayer.src = URL.createObjectURL(blob);
    setDownload(blob, filename);
    setStatus("\u751f\u6210\u5b8c\u6210");
  } catch (err) {
    setStatus(err.message || "\u751f\u6210\u5931\u8d25");
  }
});

updateCharCount();
updateEngineUI();
populateAzureVoices();

if (window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = populateVoices;
}
