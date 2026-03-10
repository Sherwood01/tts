const fileInput = document.getElementById("fileInput");
const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const fileNote = document.getElementById("fileNote");
const engineSelect = document.getElementById("engineSelect");
const voiceSelect = document.getElementById("voiceSelect");
const rateInput = document.getElementById("rateInput");
const azureVoiceInput = document.getElementById("azureVoiceInput");\nconst formatSelect = document.getElementById("formatSelect");
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
  if (engine === "browser") {
    generateBtn.textContent = "生成语音";
  } else {
    generateBtn.textContent = "生成语音";
  }
}

function populateVoices() {
  voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  voiceSelect.innerHTML = "";
  if (!voices.length) {
    const opt = document.createElement("option");
    opt.value = "default";
    opt.textContent = "默认";
    voiceSelect.appendChild(opt);
    return;
  }
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
  fileNote.textContent = `已加载: ${file.name}`;
  if (ext === "txt") {
    return await file.text();
  }
  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }
  if (ext === "doc") {
    throw new Error("浏览器端暂不支持 .doc，请先转换为 .docx");
  }
  throw new Error("不支持的文件类型");
}

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await readFile(file);
    textInput.value = text.trim();
    updateCharCount();
    setStatus("文件已导入");
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
  setStatus("已清空");
});

engineSelect.addEventListener("change", updateEngineUI);

playBtn.addEventListener("click", () => {
  if (!window.speechSynthesis) {
    setStatus("当前浏览器不支持语音合成");
    return;
  }
  const text = textInput.value.trim();
  if (!text) {
    setStatus("请先输入文本");
    return;
  }
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = voices.find((v) => v.name === voiceSelect.value);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = Number(rateInput.value);
  utterance.onstart = () => setStatus("正在播放浏览器语音");
  utterance.onend = () => setStatus("播放结束");
  utterance.onerror = () => setStatus("播放失败");
  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
});

stopBtn.addEventListener("click", () => {
  stopSpeech();
  setStatus("已停止");
});

async function callModelTTS(text) {
  const payload = {
    text,
    voice: azureVoiceInput.value.trim() || "zh-CN-XiaoxiaoNeural",
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
    throw new Error(`请求失败: ${res.status} ${textErr}`);
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
    throw new Error("返回的 JSON 缺少 audio_base64 字段");
  }

  return await res.blob();
}
generateBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("请先输入文本");
    return;
  }

  resetAudio();

  const engine = engineSelect.value;
  if (engine === "browser") {
    setStatus("浏览器语音只支持播放，不支持下载，请改用大模型引擎");
    return;
  }

  try {
    setStatus("正在生成语音...");
    const blob = await callModelTTS(text);
    const filename = `tts.${formatSelect.value}`;
    audioPlayer.src = URL.createObjectURL(blob);
    setDownload(blob, filename);
    setStatus("生成完成");
  } catch (err) {
    setStatus(err.message || "生成失败");
  }
});

updateCharCount();
updateEngineUI();

if (window.speechSynthesis) {
  populateVoices();
  window.speechSynthesis.onvoiceschanged = populateVoices;
}
