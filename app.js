const fileInput = document.getElementById("fileInput");
const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const fileNote = document.getElementById("fileNote");
const engineSelect = document.getElementById("engineSelect");
const languageFilter = document.getElementById("languageFilter");
const voiceSelect = document.getElementById("voiceSelect");
const voiceSearch = document.getElementById("voiceSearch");
const refreshVoicesBtn = document.getElementById("refreshVoicesBtn");
const rateInput = document.getElementById("rateInput");
const rateValue = document.getElementById("rateValue");
const formatSelect = document.getElementById("formatSelect");
const formatWrap = document.getElementById("formatWrap");
const modelConfig = document.getElementById("modelConfig");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");

const statusEl = document.getElementById("status");
const loadingSpinner = document.getElementById("loadingSpinner");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingOverlayText = document.getElementById("loadingOverlayText");
const STORAGE_KEY = "tts-demo-settings";
const DEFAULT_LOADING_TEXT = "\u6b63\u5728\u751f\u6210\uff0c\u8bf7\u7a0d\u5019...";
let savedSettings = null;
const audioPlayer = document.getElementById("audioPlayer");
const downloadLink = document.getElementById("downloadLink");
const clearBtn = document.getElementById("clearBtn");

let browserVoices = [];
let azureVoices = [];
let voicesLoaded = false;
let activeUtterance = null;

function setLoading(isLoading, message) {
  const text = message || DEFAULT_LOADING_TEXT;
  if (loadingOverlayText) {
    loadingOverlayText.textContent = text;
  }
  if (loadingSpinner) {
    if (isLoading) {
      loadingSpinner.classList.add("is-active");
    } else {
      loadingSpinner.classList.remove("is-active");
    }
  }
  if (loadingOverlay) {
    if (isLoading) {
      loadingOverlay.classList.add("is-active");
      loadingOverlay.setAttribute("aria-hidden", "false");
      loadingOverlay.style.display = "flex";
      loadingOverlay.style.pointerEvents = "all";
    } else {
      loadingOverlay.classList.remove("is-active");
      loadingOverlay.setAttribute("aria-hidden", "true");
      loadingOverlay.style.display = "none";
      loadingOverlay.style.pointerEvents = "none";
    }
  }
  if (document.body) {
    if (isLoading) {
      document.body.classList.add("is-loading");
    } else {
      document.body.classList.remove("is-loading");
    }
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function saveSettings() {
  const data = {
    language: languageFilter.value || "all",
    voice: voiceSelect.value || "",
    search: voiceSearch.value || "",
    rate: rateInput.value || "1",
    format: formatSelect.value || "mp3",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return;
    savedSettings = data;
    if (typeof data.search === "string") voiceSearch.value = data.search;
    if (typeof data.rate === "string" || typeof data.rate === "number") {
      rateInput.value = String(data.rate);
    }
    if (typeof data.format === "string") formatSelect.value = data.format;
  } catch (err) {
    savedSettings = null;
  }
}
function updateRateValue() {
  if (!rateValue) return;
  const value = Number(rateInput.value || 1).toFixed(1);
  rateValue.textContent = `x${value}`;
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
  formatWrap.style.display = engine === "model" ? "flex" : "none";
  updateLanguageFilter();
  if (engineSelect.value === "model" && !azureVoices.length) {
    loadAzureVoices();
  }
  populateVoiceSelect();
}

function refreshVoices() {
  populateBrowserVoices();
  setTimeout(populateBrowserVoices, 500);
  setTimeout(populateBrowserVoices, 1500);
}

function populateBrowserVoices() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  browserVoices = filterBrowserVoices(voices.map((v) => ({
    name: v.name,
    lang: v.lang || "",
    label: `${v.name} (${v.lang || ""})`,
  })));
  voicesLoaded = !!browserVoices.length;
  if (!voicesLoaded) {
    voiceSelect.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "\u6d4f\u89c8\u5668\u8bed\u97f3\u4e0d\u53ef\u7528";
    voiceSelect.appendChild(opt);
    voiceSelect.disabled = true;
    return;
  }
  updateLanguageFilter();
  if (engineSelect.value === "model" && !azureVoices.length) {
    loadAzureVoices();
  }
  populateVoiceSelect();
}

function normalizeAzureVoices(list) {
  return (list || [])
    .map((v) => {
      const name = v.ShortName || v.Name || "";
      const lang = v.Locale || "";
      const localeName = v.LocaleName || v.Locale || "";
      const voiceType = v.VoiceType || "";
      const label = localeName ? `${localeName} - ${name}` : name;
      return { name, lang, label, voiceType };
    })
    .filter((v) => v.name);
}

function sortAzureVoices(list) {
  return list.slice().sort((a, b) => {
    if (a.lang === b.lang) return a.label.localeCompare(b.label);
    return a.lang.localeCompare(b.lang);
  });
}

function isChineseLocale(lang) {
  if (!lang) return false;
  const lower = lang.toLowerCase();
  return (
    lower.startsWith("zh") ||
    lower.startsWith("yue") ||
    lower.startsWith("wuu") ||
    lower.startsWith("cmn")
  );
}

function isEnglishLocale(lang) {
  if (!lang) return false;
  return lang.toLowerCase().startsWith("en");
}

function isNaturalAzureVoice(name, voiceType) {
  const n = (name || "").toLowerCase();
  const t = (voiceType || "").toLowerCase();
  return n.includes("neural") || t.includes("neural");
}

function filterAzureVoices(list) {
  return list.filter((v) => {
    const langOk = isChineseLocale(v.lang) || isEnglishLocale(v.lang);
    const naturalOk = isNaturalAzureVoice(v.name, v.voiceType);
    return langOk && naturalOk;
  });
}

function filterBrowserVoices(list) {
  return list.filter((v) => isChineseLocale(v.lang) || isEnglishLocale(v.lang));
}

async function loadAzureVoices() {
  try {
    setLoading(true, "\u52a0\u8f7d\u8bed\u97f3\u5217\u8868\u4e2d...");
    const res = await fetch("/api/voices");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const normalized = normalizeAzureVoices(data);
    if (!normalized.length) {
      throw new Error("empty list");
    }
    azureVoices = sortAzureVoices(filterAzureVoices(normalized));
    if (engineSelect.value === "model") {
      updateLanguageFilter();
      languageFilter.value = "all";
      populateVoiceSelect();
  if (savedSettings && savedSettings.language) {
    const value = String(savedSettings.language);
    if ([...languageFilter.options].some((o) => o.value === value)) {
      languageFilter.value = value;
    }
  }
    }
    setStatus("\u5df2\u52a0\u8f7d Azure \u8bed\u97f3\u5217\u8868");
  } catch (err) {
    azureVoices = [];
    if (engineSelect.value === "model") {
      updateLanguageFilter();
      languageFilter.value = "all";
      populateVoiceSelect();
    }
    setStatus(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? "\u65e0\u6cd5\u83b7\u53d6 Azure \u8bed\u97f3\u5217\u8868，\u672c\u5730\u8bf7\u4f7f\u7528 vercel dev \u6216\u90e8\u7f72\u5230 Vercel\u6d4b\u8bd5\u3002" : "\u65e0\u6cd5\u83b7\u53d6 Azure \u8bed\u97f3\u5217\u8868");
  } finally {
    setLoading(false);
  }
  }
}

function getActiveVoices() {
  if (engineSelect.value === "model") {
    return azureVoices;
  }
  return browserVoices;
}

function updateLanguageFilter() {
  const current = languageFilter.value || "all";
  const options = [
    { value: "all", label: "全部" },
    { value: "zh", label: "中文" },
    { value: "en", label: "英文" },
  ];

  languageFilter.innerHTML = "";
  options.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === current) {
      o.selected = true;
    }
    languageFilter.appendChild(o);
  });

  if (![...languageFilter.options].some((o) => o.value === current)) {
    languageFilter.value = "all";
  }
}



function isChineseVoice(v) {
  const lang = (v.lang || "").toLowerCase();
  const label = (v.label || "").toLowerCase();
  const name = (v.name || "").toLowerCase();
  return (
    lang.startsWith("zh") ||
    lang.startsWith("yue") ||
    lang.startsWith("wuu") ||
    lang.startsWith("cmn") ||
    label.includes("chinese") ||
    label.includes("中文") ||
    name.includes("chinese") ||
    name.includes("中文")
  );
}

function isEnglishVoice(v) {
  const lang = (v.lang || "").toLowerCase();
  const label = (v.label || "").toLowerCase();
  const name = (v.name || "").toLowerCase();
  return (
    lang.startsWith("en") ||
    label.includes("english") ||
    label.includes("英文") ||
    name.includes("english") ||
    name.includes("英文")
  );
}

function isNaturalVoice(v, engine) {
  const name = (v.name || "").toLowerCase();
  const voiceType = (v.voiceType || "").toLowerCase();
  if (engine === "model") {
    return name.includes("neural") || voiceType.includes("neural");
  }
  // Browser voices: keep only Natural/Online variants when present
  if (name.includes("natural")) return true;
  if (name.includes("online")) return true;
  return false;
}

function applyFilters(list) {
  const lang = languageFilter.value || "all";
  const term = (voiceSearch.value || "").trim().toLowerCase();
  const engine = engineSelect.value;

  return list.filter((v) => {
    if (!isNaturalVoice(v, engine)) return false;

    if (lang === "zh" && !isChineseVoice(v)) return false;
    if (lang === "en" && !isEnglishVoice(v)) return false;

    if (!term) return true;
    const name = (v.name || "").toLowerCase();
    const label = (v.label || "").toLowerCase();
    const l = (v.lang || "").toLowerCase();
    return name.includes(term) || label.includes(term) || l.includes(term);
  });
}


function populateVoiceSelect() {
  const list = applyFilters(getActiveVoices());
  const current = voiceSelect.value;
  voiceSelect.innerHTML = "";
  if (!list.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "\u65e0\u5339\u914d\u8bed\u97f3";
    voiceSelect.appendChild(opt);
    voiceSelect.disabled = true;
    return;
  }
  voiceSelect.disabled = false;
  list.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = v.label || v.name;
    if (v.name === current) {
      opt.selected = true;
    }
    voiceSelect.appendChild(opt);
  });
  if (savedSettings && savedSettings.voice) {
    const savedVoice = String(savedSettings.voice);
    if ([...voiceSelect.options].some((o) => o.value === savedVoice)) {
      voiceSelect.value = savedVoice;
    }
  }
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
  const maxSize = Number(fileInput.dataset.maxSize || 0);
  if (maxSize && file.size > maxSize) {
    setStatus("\u6587\u4ef6\u592a\u5927\uff0c\u8bf7\u4e0a\u4f20 10MB \u4ee5\u5185\u7684\u6587\u4ef6");
    fileInput.value = "";
    return;
  }
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
rateInput.addEventListener("input", () => { updateRateValue(); saveSettings(); });

clearBtn.addEventListener("click", () => {
  fileInput.value = "";
  textInput.value = "";
  fileNote.textContent = "";
  updateCharCount();
  resetAudio();
  setStatus("\u5df2\u6e05\u7a7a");
});

engineSelect.addEventListener("change", () => {
  voiceSearch.value = "";
  updateEngineUI();
});
languageFilter.addEventListener("change", () => { populateVoiceSelect(); saveSettings(); });
formatSelect.addEventListener("change", saveSettings);
voiceSearch.addEventListener("input", () => { populateVoiceSelect(); saveSettings(); });
voiceSelect.addEventListener("change", saveSettings);

playBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("\u8bf7\u5148\u8f93\u5165\u6587\u672c");
    return;
  }

  resetAudio();

  const engine = engineSelect.value;
  if (engine === "browser") {
    if (!window.speechSynthesis) {
      setStatus("\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u8bed\u97f3\u5408\u6210");
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    setLoading(true);
    const selectedVoice = window.speechSynthesis.getVoices().find((v) => v.name === voiceSelect.value);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = Number(rateInput.value);
    utterance.onstart = () => {
      setLoading(false);
      setStatus("\u6b63\u5728\u64ad\u653e\u6d4f\u89c8\u5668\u8bed\u97f3");
    };
    utterance.onend = () => {
      setLoading(false);
      setStatus("\u64ad\u653e\u7ed3\u675f");
    };
    utterance.onerror = () => {
      setLoading(false);
      setStatus("\u64ad\u653e\u5931\u8d25");
    };
    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return;
  }

  try {
    setLoading(true);
    setStatus("\u6b63\u5728\u751f\u6210\u8bed\u97f3...");
    const blob = await callModelTTS(text);
    const filename = `tts.${formatSelect.value}`;
    audioPlayer.src = URL.createObjectURL(blob);
    setDownload(blob, filename);
    audioPlayer.onplay = () => setLoading(false);
    audioPlayer.onended = () => setStatus("\u64ad\u653e\u7ed3\u675f");
    audioPlayer.play().catch(() => {
      setLoading(false);
      setStatus("\u64ad\u653e\u5931\u8d25");
    });
    setStatus("\u6b63\u5728\u64ad\u653e\u751f\u6210\u8bed\u97f3");
  } catch (err) {
    setLoading(false);
    setStatus(err.message || "\u751f\u6210\u5931\u8d25");
  }
});


function stopAllPlayback() {
  stopSpeech();
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }
  setLoading(false);
  setStatus("\u64ad\u653e\u505c\u6b62");
}

stopBtn.addEventListener("click", stopAllPlayback);


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
  const voice = voiceSelect.value;
  if (!voice || !azureVoices.find((v) => v.name === voice)) {
    throw new Error("\u8bf7\u5148\u9009\u62e9 Azure TTS \u8bed\u97f3");
  }

  const payload = {
    text,
    voice,
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



updateCharCount();
loadSettings();
updateRateValue();
updateEngineUI();
window.addEventListener("beforeunload", () => {
  stopAllPlayback();
});

loadAzureVoices();

if (window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = populateBrowserVoices;
}

































