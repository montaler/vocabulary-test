const STORAGE_KEYS = {
  vocabulary: "word-test-vocabulary",
  history: "word-test-history",
  counters: "word-test-counters",
  meanings: "word-test-meanings"
};

const state = {
  vocabulary: [],
  fileName: "",
  history: [],
  counters: {},
  meanings: {},
  currentTest: null
};

const elements = {
  csvFile: document.getElementById("csvFile"),
  wordCount: document.getElementById("wordCount"),
  fileName: document.getElementById("fileName"),
  wordPreview: document.getElementById("wordPreview"),
  startForm: document.getElementById("startForm"),
  usernameInput: document.getElementById("usernameInput"),
  testMeta: document.getElementById("testMeta"),
  progressText: document.getElementById("progressText"),
  pronounceBtn: document.getElementById("pronounceBtn"),
  showWordBtn: document.getElementById("showWordBtn"),
  showMeaningBtn: document.getElementById("showMeaningBtn"),
  wordDisplay: document.getElementById("wordDisplay"),
  meaningDisplay: document.getElementById("meaningDisplay"),
  knowCount: document.getElementById("knowCount"),
  notSureCount: document.getElementById("notSureCount"),
  dontKnowCount: document.getElementById("dontKnowCount"),
  historyList: document.getElementById("historyList"),
  historyTemplate: document.getElementById("historyTemplate")
};

function init() {
  loadState();
  bindEvents();
  renderVocabulary();
  renderCurrentTest();
  renderHistory();
}

function loadState() {
  state.vocabulary = readStorage(STORAGE_KEYS.vocabulary, []);
  state.history = readStorage(STORAGE_KEYS.history, []);
  state.counters = readStorage(STORAGE_KEYS.counters, {});
  state.meanings = readStorage(STORAGE_KEYS.meanings, {});

  if (state.vocabulary.length > 0) {
    state.fileName = state.vocabulary[0]?.sourceFile || "Saved vocabulary";
  }
}

function bindEvents() {
  elements.csvFile.addEventListener("change", handleCsvUpload);
  elements.startForm.addEventListener("submit", handleStartTest);
  elements.pronounceBtn.addEventListener("click", pronounceCurrentWord);
  elements.showWordBtn.addEventListener("click", revealWord);
  elements.showMeaningBtn.addEventListener("click", revealMeaning);

  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => submitAnswer(button.dataset.answer));
  });
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key}`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function handleCsvUpload(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    const words = parseCsvWords(text);

    if (words.length === 0) {
      alert("No words were found. Please upload a CSV file with one column of English words.");
      return;
    }

    state.vocabulary = words.map((word) => ({ word, sourceFile: file.name }));
    state.fileName = file.name;
    saveStorage(STORAGE_KEYS.vocabulary, state.vocabulary);
    renderVocabulary();
  };

  reader.readAsText(file);
}

function parseCsvWords(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const words = lines
    .map((line) => line.split(",")[0]?.replace(/^"|"$/g, "").trim())
    .filter(Boolean)
    .filter((word, index, array) => array.indexOf(word) === index);

  if (words.length > 0 && isHeaderRow(words[0])) {
    return words.slice(1);
  }

  return words;
}

function isHeaderRow(value) {
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  return normalized === "word" || normalized === "words" || normalized === "englishword";
}

function handleStartTest(event) {
  event.preventDefault();

  if (state.vocabulary.length === 0) {
    alert("Please upload a CSV vocabulary file first.");
    return;
  }

  const username = elements.usernameInput.value.trim();
  if (!username) {
    alert("Please enter a username.");
    return;
  }

  const nextTestNumber = (state.counters[username] || 0) + 1;
  state.counters[username] = nextTestNumber;
  saveStorage(STORAGE_KEYS.counters, state.counters);

  state.currentTest = {
    username,
    testNumber: nextTestNumber,
    startedAt: new Date().toISOString(),
    items: shuffle([...state.vocabulary]).map((entry) => ({
      word: entry.word,
      answer: null,
      meaning: ""
    })),
    currentIndex: 0,
    counts: {
      know: 0,
      not_sure: 0,
      dont_know: 0
    }
  };

  elements.startForm.reset();
  renderCurrentTest();
}

function renderVocabulary() {
  elements.wordCount.textContent = String(state.vocabulary.length);
  elements.fileName.textContent = state.fileName || "None";
  elements.wordPreview.innerHTML = "";

  const preview = state.vocabulary.slice(0, 12);
  if (preview.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No words uploaded yet";
    elements.wordPreview.appendChild(empty);
    return;
  }

  preview.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry.word;
    elements.wordPreview.appendChild(item);
  });
}

function renderCurrentTest() {
  const active = state.currentTest;
  const hasActiveWord = Boolean(active && active.currentIndex < active.items.length);

  toggleTestButtons(hasActiveWord);
  renderLiveSummary();

  if (!active) {
    elements.testMeta.textContent = "No active test yet.";
    elements.testMeta.classList.add("empty");
    elements.progressText.textContent = "Please upload vocabulary and start a test.";
    elements.wordDisplay.textContent = "?";
    elements.meaningDisplay.textContent = "?";
    return;
  }

  elements.testMeta.textContent = `${active.username}-${active.testNumber} | ${active.items.length} words`;
  elements.testMeta.classList.remove("empty");

  if (!hasActiveWord) {
    finalizeCurrentTest();
    return;
  }

  const currentItem = active.items[active.currentIndex];
  elements.progressText.textContent = `Word ${active.currentIndex + 1} of ${active.items.length}`;
  elements.wordDisplay.textContent = "?";
  elements.meaningDisplay.textContent = "?";
  elements.showWordBtn.dataset.revealed = "false";
  elements.showMeaningBtn.dataset.loaded = currentItem.meaning ? "true" : "false";
}

function toggleTestButtons(enabled) {
  [
    elements.pronounceBtn,
    elements.showWordBtn,
    elements.showMeaningBtn,
    ...document.querySelectorAll("[data-answer]")
  ].forEach((button) => {
    button.disabled = !enabled;
  });
}

function renderLiveSummary() {
  const counts = state.currentTest?.counts || {
    know: 0,
    not_sure: 0,
    dont_know: 0
  };

  elements.knowCount.textContent = String(counts.know);
  elements.notSureCount.textContent = String(counts.not_sure);
  elements.dontKnowCount.textContent = String(counts.dont_know);
}

function getCurrentItem() {
  if (!state.currentTest) {
    return null;
  }

  return state.currentTest.items[state.currentTest.currentIndex] || null;
}

function pronounceCurrentWord() {
  const item = getCurrentItem();
  if (!item) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("This browser does not support speech synthesis.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(item.word);
  utterance.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function revealWord() {
  const item = getCurrentItem();
  if (!item) {
    return;
  }

  elements.wordDisplay.textContent = item.word;
}

async function revealMeaning() {
  const item = getCurrentItem();
  if (!item) {
    return;
  }

  if (item.meaning) {
    elements.meaningDisplay.textContent = item.meaning;
    return;
  }

  elements.meaningDisplay.textContent = "Loading...";

  const cachedMeaning = state.meanings[item.word.toLowerCase()];
  if (cachedMeaning) {
    item.meaning = cachedMeaning;
    elements.meaningDisplay.textContent = cachedMeaning;
    return;
  }

  try {
    const meaning = await fetchMeaning(item.word);
    item.meaning = meaning;
    state.meanings[item.word.toLowerCase()] = meaning;
    saveStorage(STORAGE_KEYS.meanings, state.meanings);
    elements.meaningDisplay.textContent = meaning;
  } catch (error) {
    console.error("Meaning lookup failed", error);
    item.meaning = "Meaning unavailable";
    elements.meaningDisplay.textContent = item.meaning;
  }
}

async function fetchMeaning(word) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!response.ok) {
    throw new Error("Meaning request failed");
  }

  const data = await response.json();
  const firstDefinition = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
  return firstDefinition || "Meaning unavailable";
}

function submitAnswer(answer) {
  const active = state.currentTest;
  const item = getCurrentItem();
  if (!active || !item || item.answer) {
    return;
  }

  item.answer = answer;
  item.meaning = item.meaning || state.meanings[item.word.toLowerCase()] || "";
  active.counts[answer] += 1;
  active.currentIndex += 1;
  renderCurrentTest();
}

function finalizeCurrentTest() {
  const completedTest = {
    username: state.currentTest.username,
    testNumber: state.currentTest.testNumber,
    startedAt: state.currentTest.startedAt,
    completedAt: new Date().toISOString(),
    totalWords: state.currentTest.items.length,
    counts: state.currentTest.counts,
    items: state.currentTest.items
  };

  state.history.unshift(completedTest);
  saveStorage(STORAGE_KEYS.history, state.history);

  const testCode = `${completedTest.username}-${completedTest.testNumber}`;
  alert(`Test complete: ${testCode}`);

  state.currentTest = null;
  renderHistory();
  renderCurrentTest();
}

function renderHistory() {
  elements.historyList.innerHTML = "";

  if (state.history.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No test records yet.";
    elements.historyList.appendChild(empty);
    return;
  }

  state.history.forEach((test) => {
    const fragment = elements.historyTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".history-card");
    const title = fragment.querySelector(".history-title");
    const subtitle = fragment.querySelector(".history-subtitle");
    const stats = fragment.querySelector(".history-stats");
    const details = fragment.querySelector(".history-details");
    const toggle = fragment.querySelector(".toggle-btn");

    title.textContent = `${test.username}-${test.testNumber}`;
    subtitle.textContent = `Completed ${formatDate(test.completedAt)} | ${test.totalWords} words`;

    const statItems = [
      { label: "Know", value: test.counts.know },
      { label: "Not Sure", value: test.counts.not_sure },
      { label: "Don't Know", value: test.counts.dont_know }
    ];

    statItems.forEach((item) => {
      const stat = document.createElement("div");
      stat.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
      stats.appendChild(stat);
    });

    test.items.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "history-word";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(entry.word)}</strong>
          <small>${escapeHtml(entry.meaning || "Meaning not viewed during test")}</small>
        </div>
        <span class="pill ${entry.answer}">${formatAnswer(entry.answer)}</span>
      `;
      details.appendChild(row);
    });

    toggle.addEventListener("click", () => {
      const isHidden = details.classList.toggle("hidden");
      toggle.textContent = isHidden ? "Show Details" : "Hide Details";
    });

    elements.historyList.appendChild(card);
  });
}

function formatAnswer(answer) {
  if (answer === "know") {
    return "I know it";
  }

  if (answer === "not_sure") {
    return "Not sure";
  }

  return "I don't know";
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }

  return array;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

init();
