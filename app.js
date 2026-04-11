const STORAGE_KEYS = {
  pools: "word-test-pools",
  history: "word-test-history",
  counters: "word-test-counters",
  meanings: "word-test-meanings"
};

const state = {
  pools: [],
  fileName: "",
  history: [],
  counters: {},
  meanings: {},
  uploadedWords: [],
  currentTest: null
};

const elements = {
  poolForm: document.getElementById("poolForm"),
  poolNameInput: document.getElementById("poolNameInput"),
  csvFile: document.getElementById("csvFile"),
  poolCount: document.getElementById("poolCount"),
  fileName: document.getElementById("fileName"),
  poolList: document.getElementById("poolList"),
  startForm: document.getElementById("startForm"),
  usernameInput: document.getElementById("usernameInput"),
  poolSelect: document.getElementById("poolSelect"),
  testMeta: document.getElementById("testMeta"),
  progressText: document.getElementById("progressText"),
  pronounceBtn: document.getElementById("pronounceBtn"),
  showWordBtn: document.getElementById("showWordBtn"),
  showMeaningBtn: document.getElementById("showMeaningBtn"),
  wordDisplay: document.getElementById("wordDisplay"),
  partOfSpeechDisplay: document.getElementById("partOfSpeechDisplay"),
  meaningDisplay: document.getElementById("meaningDisplay"),
  sampleSentenceDisplay: document.getElementById("sampleSentenceDisplay"),
  knowCount: document.getElementById("knowCount"),
  notSureCount: document.getElementById("notSureCount"),
  dontKnowCount: document.getElementById("dontKnowCount"),
  historyList: document.getElementById("historyList"),
  historyTemplate: document.getElementById("historyTemplate")
};

function init() {
  loadState();
  bindEvents();
  renderPools();
  renderCurrentTest();
  renderHistory();
}

function loadState() {
  state.pools = readStorage(STORAGE_KEYS.pools, []);
  state.history = readStorage(STORAGE_KEYS.history, []);
  state.counters = readStorage(STORAGE_KEYS.counters, {});
  state.meanings = readStorage(STORAGE_KEYS.meanings, {});

  if (state.pools.length > 0) {
    state.fileName = state.pools[0].sourceFile || "Saved vocabulary";
  }
}

function bindEvents() {
  elements.csvFile.addEventListener("change", handleCsvPreview);
  elements.poolForm.addEventListener("submit", handlePoolSave);
  elements.startForm.addEventListener("submit", handleStartFullPoolTest);
  elements.pronounceBtn.addEventListener("click", pronounceCurrentWord);
  elements.showWordBtn.addEventListener("click", revealWord);
  elements.showMeaningBtn.addEventListener("click", revealMeaning);

  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => submitAnswer(button.dataset.answer));
  });

  document.addEventListener("keydown", handleKeyboardShortcuts);
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

function handleCsvPreview(event) {
  const [file] = event.target.files;
  if (!file) {
    state.uploadedWords = [];
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    state.uploadedWords = parseCsvWords(text);
    state.fileName = file.name;
    renderPools();
  };

  reader.readAsText(file);
}

function handlePoolSave(event) {
  event.preventDefault();

  const poolName = elements.poolNameInput.value.trim();
  const [file] = elements.csvFile.files;

  if (!poolName) {
    alert("Please enter a pool name.");
    return;
  }

  if (!file || state.uploadedWords.length === 0) {
    alert("Please choose a CSV file with at least one word.");
    return;
  }

  const poolId = slugify(poolName);
  const existingIndex = state.pools.findIndex((pool) => pool.id === poolId);
  const newPool = {
    id: poolId,
    name: poolName,
    words: [...state.uploadedWords],
    sourceFile: file.name,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    state.pools[existingIndex] = newPool;
  } else {
    state.pools.push(newPool);
  }

  saveStorage(STORAGE_KEYS.pools, state.pools);
  state.fileName = file.name;
  state.uploadedWords = [];
  elements.poolForm.reset();
  renderPools();
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

function renderPools() {
  elements.poolCount.textContent = String(state.pools.length);
  elements.fileName.textContent = state.fileName || "None";
  renderPoolList();
  renderPoolSelect();
}

function renderPoolList() {
  elements.poolList.innerHTML = "";

  if (state.pools.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No test pools saved yet.";
    elements.poolList.appendChild(empty);
    return;
  }

  state.pools.forEach((pool) => {
    const card = document.createElement("article");
    card.className = "pool-card";
    card.innerHTML = `
      <div>
        <h3>${escapeHtml(pool.name)}</h3>
        <p>${pool.words.length} words from ${escapeHtml(pool.sourceFile || "CSV upload")}</p>
      </div>
      <div class="pool-preview">${pool.words.slice(0, 8).map((word) => `<span>${escapeHtml(word)}</span>`).join("")}</div>
    `;
    elements.poolList.appendChild(card);
  });
}

function renderPoolSelect() {
  const previousValue = elements.poolSelect.value;
  elements.poolSelect.innerHTML = "";

  if (state.pools.length === 0) {
    const option = document.createElement("option");
    option.textContent = "Create a pool first";
    option.value = "";
    elements.poolSelect.appendChild(option);
    elements.poolSelect.disabled = true;
    return;
  }

  elements.poolSelect.disabled = false;

  const placeholder = document.createElement("option");
  placeholder.textContent = "Choose a word pool";
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = !previousValue;
  elements.poolSelect.appendChild(placeholder);

  state.pools.forEach((pool) => {
    const option = document.createElement("option");
    option.value = pool.id;
    option.textContent = `${pool.name} (${pool.words.length} words)`;
    if (pool.id === previousValue) {
      option.selected = true;
    }
    elements.poolSelect.appendChild(option);
  });
}

function handleStartFullPoolTest(event) {
  event.preventDefault();

  const username = elements.usernameInput.value.trim();
  const poolId = elements.poolSelect.value;

  if (state.currentTest) {
    const shouldReplace = window.confirm("A test is already running. Replace it with a new full pool test?");
    if (!shouldReplace) {
      return;
    }
  }

  if (!username) {
    alert("Please enter a username.");
    return;
  }

  if (!poolId) {
    alert("Please choose a word pool.");
    return;
  }

  const pool = state.pools.find((item) => item.id === poolId);
  if (!pool) {
    alert("The selected word pool was not found.");
    return;
  }

  startTestSession({
    username,
    pool,
    items: pool.words,
    mode: "full",
    sourceTestCode: null
  });
}

function startTestSession({ username, pool, items, mode, sourceTestCode }) {
  const normalizedUsername = username.trim();
  const nextTestNumber = (state.counters[normalizedUsername] || 0) + 1;
  state.counters[normalizedUsername] = nextTestNumber;
  saveStorage(STORAGE_KEYS.counters, state.counters);

  state.currentTest = {
    username: normalizedUsername,
    testNumber: nextTestNumber,
    poolId: pool.id,
    poolName: pool.name,
    mode,
    sourceTestCode,
    startedAt: new Date().toISOString(),
    items: shuffle([...items]).map((word) => ({
      word,
      answer: null,
      details: normalizeWordDetails(state.meanings[word.toLowerCase()])
    })),
    currentIndex: 0,
    counts: {
      know: 0,
      not_sure: 0,
      dont_know: 0
    }
  };

  renderCurrentTest();
}

function renderCurrentTest() {
  const active = state.currentTest;
  const hasActiveWord = Boolean(active && active.currentIndex < active.items.length);

  toggleTestButtons(hasActiveWord);
  renderLiveSummary();

  if (!active) {
    elements.testMeta.textContent = "No active test yet.";
    elements.testMeta.classList.add("empty");
    elements.progressText.textContent = "Create a pool and start a test.";
    elements.wordDisplay.textContent = "?";
    elements.partOfSpeechDisplay.textContent = "?";
    elements.meaningDisplay.textContent = "?";
    elements.sampleSentenceDisplay.textContent = "?";
    return;
  }

  const modeLabel = active.mode === "retry" ? "Missed Word Retest" : "Full Pool Test";
  elements.testMeta.textContent = `${active.username}-${active.testNumber} | ${active.poolName} | ${modeLabel}`;
  elements.testMeta.classList.remove("empty");

  if (!hasActiveWord) {
    finalizeCurrentTest();
    return;
  }

  const currentItem = active.items[active.currentIndex];
  elements.progressText.textContent = `Word ${active.currentIndex + 1} of ${active.items.length}`;
  elements.wordDisplay.textContent = "?";
  elements.partOfSpeechDisplay.textContent = "?";
  elements.meaningDisplay.textContent = "?";
  elements.sampleSentenceDisplay.textContent = "?";
  elements.showMeaningBtn.dataset.loaded = hasWordDetails(currentItem.details) ? "true" : "false";
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
  const details = normalizeWordDetails(item.details);
  elements.partOfSpeechDisplay.textContent = details.partOfSpeech || "?";
  elements.sampleSentenceDisplay.textContent = details.sampleSentence || "?";
}

async function revealMeaning() {
  const item = getCurrentItem();
  if (!item) {
    return;
  }

  if (hasWordDetails(item.details)) {
    renderWordDetails(item);
    return;
  }

  elements.meaningDisplay.textContent = "Loading...";
  elements.partOfSpeechDisplay.textContent = "Loading...";
  elements.sampleSentenceDisplay.textContent = "Loading...";

  try {
    const details = await fetchWordDetails(item.word);
    item.details = details;
    state.meanings[item.word.toLowerCase()] = details;
    saveStorage(STORAGE_KEYS.meanings, state.meanings);
    renderWordDetails(item);
  } catch (error) {
    console.error("Meaning lookup failed", error);
    item.details = {
      meaning: "Meaning unavailable",
      partOfSpeech: "Unavailable",
      sampleSentence: "No sample sentence available"
    };
    renderWordDetails(item);
  }
}

async function fetchWordDetails(word) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!response.ok) {
    throw new Error("Meaning request failed");
  }

  const data = await response.json();
  const firstMeaning = data?.[0]?.meanings?.[0];
  const firstDefinition = firstMeaning?.definitions?.[0];

  return {
    meaning: firstDefinition?.definition || "Meaning unavailable",
    partOfSpeech: formatPartOfSpeech(firstMeaning?.partOfSpeech),
    sampleSentence: firstDefinition?.example || data?.[0]?.meanings?.[1]?.definitions?.[0]?.example || "No sample sentence available"
  };
}

function submitAnswer(answer) {
  const active = state.currentTest;
  const item = getCurrentItem();
  if (!active || !item || item.answer) {
    return;
  }

  item.answer = answer;
  item.details = normalizeWordDetails(item.details || state.meanings[item.word.toLowerCase()]);
  active.counts[answer] += 1;
  active.currentIndex += 1;
  renderCurrentTest();
}

function finalizeCurrentTest() {
  const completedTest = {
    username: state.currentTest.username,
    testNumber: state.currentTest.testNumber,
    poolId: state.currentTest.poolId,
    poolName: state.currentTest.poolName,
    mode: state.currentTest.mode,
    sourceTestCode: state.currentTest.sourceTestCode,
    startedAt: state.currentTest.startedAt,
    completedAt: new Date().toISOString(),
    totalWords: state.currentTest.items.length,
    counts: state.currentTest.counts,
    items: state.currentTest.items
  };

  state.history.unshift(completedTest);
  saveStorage(STORAGE_KEYS.history, state.history);

  alert(`Test complete: ${getTestCode(completedTest)}`);

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
    const actions = fragment.querySelector(".history-actions");
    const details = fragment.querySelector(".history-details");
    const toggle = fragment.querySelector(".toggle-btn");

    const missedWords = getMissedWords(test);
    title.textContent = getTestCode(test);
    subtitle.textContent = `${test.poolName} | ${formatMode(test.mode)} | ${formatDate(test.completedAt)}`;

    [
      { label: "Know", value: test.counts.know },
      { label: "Not Sure", value: test.counts.not_sure },
      { label: "Don't Know", value: test.counts.dont_know },
      { label: "Retest Words", value: missedWords.length }
    ].forEach((item) => {
      const stat = document.createElement("div");
      stat.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
      stats.appendChild(stat);
    });

    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "secondary-btn";
    retryButton.textContent = missedWords.length > 0 ? `Retest ${missedWords.length} Missed Words` : "No Missed Words";
    retryButton.disabled = missedWords.length === 0;
    retryButton.addEventListener("click", () => restartFromHistory(test, "retry"));
    actions.appendChild(retryButton);

    const fullButton = document.createElement("button");
    fullButton.type = "button";
    fullButton.className = "secondary-btn";
    fullButton.textContent = `Start Full ${test.totalWords}-Word Pool`;
    fullButton.addEventListener("click", () => restartFromHistory(test, "full"));
    actions.appendChild(fullButton);

    test.items.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "history-word";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(entry.word)}</strong>
          <small>${escapeHtml(getHistorySummary(entry))}</small>
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

function restartFromHistory(test, mode) {
  if (state.currentTest) {
    const shouldReplace = window.confirm("A test is already running. Replace it with this new test?");
    if (!shouldReplace) {
      return;
    }
  }

  const pool = state.pools.find((item) => item.id === test.poolId);
  if (!pool) {
    alert("The original word pool is no longer available.");
    return;
  }

  const items = mode === "retry" ? getMissedWords(test) : pool.words;
  if (items.length === 0) {
    alert("There are no missed words to retest.");
    return;
  }

  elements.usernameInput.value = test.username;
  elements.poolSelect.value = pool.id;

  startTestSession({
    username: test.username,
    pool,
    items,
    mode,
    sourceTestCode: getTestCode(test)
  });
}

function getMissedWords(test) {
  return test.items
    .filter((item) => item.answer === "not_sure" || item.answer === "dont_know")
    .map((item) => item.word);
}

function getTestCode(test) {
  return `${test.username}-${test.testNumber}`;
}

function formatMode(mode) {
  return mode === "retry" ? "Missed Word Retest" : "Full Pool Test";
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

function normalizeWordDetails(value) {
  if (!value) {
    return {
      meaning: "",
      partOfSpeech: "",
      sampleSentence: ""
    };
  }

  if (typeof value === "string") {
    return {
      meaning: value,
      partOfSpeech: "",
      sampleSentence: ""
    };
  }

  return {
    meaning: value.meaning || "",
    partOfSpeech: value.partOfSpeech || "",
    sampleSentence: value.sampleSentence || ""
  };
}

function hasWordDetails(details) {
  const normalized = normalizeWordDetails(details);
  return Boolean(normalized.meaning || normalized.partOfSpeech || normalized.sampleSentence);
}

function renderWordDetails(item) {
  const details = normalizeWordDetails(item.details);
  elements.wordDisplay.textContent = item.word;
  elements.partOfSpeechDisplay.textContent = details.partOfSpeech || "?";
  elements.meaningDisplay.textContent = details.meaning || "Meaning unavailable";
  elements.sampleSentenceDisplay.textContent = details.sampleSentence || "No sample sentence available";
}

function formatPartOfSpeech(value) {
  if (!value) {
    return "Unknown";
  }

  const mapping = {
    noun: "n.",
    pronoun: "pron.",
    adjective: "adj.",
    verb: "v.",
    adverb: "adv.",
    preposition: "prep.",
    conjunction: "conj.",
    interjection: "interj.",
    article: "art."
  };

  return mapping[value.toLowerCase()] || value;
}

function getHistorySummary(entry) {
  const details = normalizeWordDetails(entry.details);
  const summary = [];

  if (details.partOfSpeech) {
    summary.push(details.partOfSpeech);
  }

  if (details.meaning) {
    summary.push(details.meaning);
  }

  if (details.sampleSentence) {
    summary.push(details.sampleSentence);
  }

  return summary.join(" | ") || "Meaning not viewed during test";
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }

  return array;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `pool-${Date.now()}`;
}

function handleKeyboardShortcuts(event) {
  const tagName = document.activeElement?.tagName;
  if (tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA") {
    return;
  }

  if (!state.currentTest) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "p") {
    event.preventDefault();
    pronounceCurrentWord();
    return;
  }

  if (key === "w") {
    event.preventDefault();
    revealWord();
    return;
  }

  if (key === "m") {
    event.preventDefault();
    revealMeaning();
    return;
  }

  if (key === "1") {
    event.preventDefault();
    submitAnswer("know");
    return;
  }

  if (key === "2") {
    event.preventDefault();
    submitAnswer("not_sure");
    return;
  }

  if (key === "3") {
    event.preventDefault();
    submitAnswer("dont_know");
  }
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
