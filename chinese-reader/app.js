const API = "https://athens.tailebb1c8.ts.net/chinese-reader/";
console.log("app.js loaded");

const bookSelect = document.getElementById("bookSelect");
const chapterSelect = document.getElementById("chapterSelect");
const titleEl = document.getElementById("title");
const readerEl = document.getElementById("reader");

const popup = document.getElementById("popup");
const popupWord = document.getElementById("popupWord");
const popupPinyin = document.getElementById("popupPinyin");
const popupDefs = document.getElementById("popupDefs");
const popupDebug = document.getElementById("popupDebug");

const playAllBtn = document.getElementById("playAllBtn");
const ttsRateEl = document.getElementById("ttsRate");
const ttsRateLabel = document.getElementById("ttsRateLabel");

const navStoriesBtn = document.getElementById("navStories");
const navVocabBtn = document.getElementById("navVocab");
const storiesView = document.getElementById("storiesView");
const vocabView = document.getElementById("vocabView");
const storiesControls = document.getElementById("storiesControls");

const themeToggleBtn = document.getElementById("themeToggle");

/* Vocab panel elements */
const vocabSummaryPanel = document.getElementById("vocabSummaryPanel");
const vocabLevelPanel = document.getElementById("vocabLevelPanel");
const hskCardsEl = document.getElementById("hskCards");

const vocabBackBtn = document.getElementById("vocabBackBtn");
const vocabLevelTitle = document.getElementById("vocabLevelTitle");
const vocabLevelMeta = document.getElementById("vocabLevelMeta");
const vocabListEl = document.getElementById("vocabList");

const filterAllBtn = document.getElementById("filterAll");
const filterLearnedBtn = document.getElementById("filterLearned");
const filterNotLearnedBtn = document.getElementById("filterNotLearned");
const vocabSearchEl = document.getElementById("vocabSearch");

/* HSK schema toggle */
const schema30Btn = document.getElementById("schema30");
const schema20Btn = document.getElementById("schema20");

let isPlayingAll = false;
let currentView = "stories"; // "stories" | "vocab"
let current = { bookId: null, chapterId: null, text: "", titleText: "", enSentences: [] };

/* Vocab cache + state */
let vocabCache = null; // { dict, progress, learnedMap }
let vocabMode = "summary"; // "summary" | "level"
let activeHskLevel = null; // number (from tag suffix)
let vocabFilter = "all"; // "all" | "learned" | "not"
let vocabQuery = "";

/* HSK schema: "3.0" | "2.0" (default 3.0) */
let hskSchema = "3.0";

// -------------------- HSK schema --------------------

function loadHskSchema() {
  const saved = localStorage.getItem("hskSchema");
  if (saved === "2.0" || saved === "3.0") hskSchema = saved;
  else hskSchema = "3.0";
  applyHskSchemaButtons();
}

function setHskSchema(next) {
  if (next !== "2.0" && next !== "3.0") return;
  if (hskSchema === next) return;

  hskSchema = next;
  localStorage.setItem("hskSchema", hskSchema);
  applyHskSchemaButtons();

  // Re-render whichever vocab screen you're on
  if (currentView === "vocab") {
    if (vocabMode === "level" && activeHskLevel != null) {
      showVocabLevel(activeHskLevel);
    } else {
      showVocabSummary();
    }
  }
}

function applyHskSchemaButtons() {
  schema30Btn?.classList.toggle("is-active", hskSchema === "3.0");
  schema20Btn?.classList.toggle("is-active", hskSchema === "2.0");
}

schema30Btn?.addEventListener("click", (e) => {
  e.stopPropagation();
  setHskSchema("3.0");
});

schema20Btn?.addEventListener("click", (e) => {
  e.stopPropagation();
  setHskSchema("2.0");
});

// -------------------- TTS --------------------

function getTtsRate() {
  const v = Number(ttsRateEl?.value ?? 1.0);
  return Number.isFinite(v) ? v : 1.0;
}

if (ttsRateEl && ttsRateLabel) {
  ttsRateLabel.textContent = `${getTtsRate().toFixed(2)}×`;
  ttsRateEl.addEventListener("input", () => {
    ttsRateLabel.textContent = `${getTtsRate().toFixed(2)}×`;
  });
}

function speak(text) {
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = getTtsRate();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function speakAll(text) {
  if (!text) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = getTtsRate();

  isPlayingAll = true;
  if (playAllBtn) playAllBtn.textContent = "Pause";

  u.onend = () => {
    isPlayingAll = false;
    if (playAllBtn) playAllBtn.textContent = "Play";
  };
  u.onerror = () => {
    isPlayingAll = false;
    if (playAllBtn) playAllBtn.textContent = "Play";
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function stopAll() {
  window.speechSynthesis.cancel();
  isPlayingAll = false;
  if (playAllBtn) playAllBtn.textContent = "Play";
}

if (playAllBtn) {
  playAllBtn.addEventListener("click", () => {
    if (isPlayingAll) {
      stopAll();
      return;
    }
    const title = (current.titleText || "").trim();
    const body = (current.text || "").trim();
    const combined = title ? `${title}\n\n${body}` : body;
    speakAll(combined);
  });
}

// -------------------- Popup --------------------

function showPopup(x, y) {
  popup.classList.remove("hidden");

  const pad = 12;
  const rect = popup.getBoundingClientRect();
  const w = rect.width || 360;
  const h = rect.height || 140;
  const maxX = window.innerWidth - w - pad;
  const maxY = window.innerHeight - h - pad;

  const px = Math.max(pad, Math.min(x, maxX));
  const py = Math.max(pad, Math.min(y, maxY));

  popup.style.left = `${px}px`;
  popup.style.top = `${py}px`;
}

function hidePopup() {
  popup.classList.add("hidden");
}

// click away closes popup
document.addEventListener("click", (e) => {
  if (popup.classList.contains("hidden")) return;

  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  if (popup.contains(target)) return;
  if (target.classList.contains("ch")) return;

  hidePopup();
});

popup.addEventListener("click", (e) => e.stopPropagation());

// -------------------- Fetch helpers --------------------

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// -------------------- Views --------------------

function setActiveNav() {
  navStoriesBtn?.classList.toggle("is-active", currentView === "stories");
  navVocabBtn?.classList.toggle("is-active", currentView === "vocab");
}

async function setView(view) {
  currentView = view;
  setActiveNav();

  const showStories = view === "stories";
  storiesView?.classList.toggle("hidden", !showStories);
  storiesControls?.classList.toggle("hidden", !showStories);
  vocabView?.classList.toggle("hidden", showStories);

  hidePopup();

  if (!showStories) {
    await showVocabSummary();
  }
}

navStoriesBtn?.addEventListener("click", () => setView("stories"));
navVocabBtn?.addEventListener("click", () => setView("vocab"));

// -------------------- Theme --------------------

function getTheme() {
  return document.documentElement.dataset.theme || null; // "dark" | "light" | null
}

function applyThemeLabel() {
  const t = getTheme();
  if (themeToggleBtn) themeToggleBtn.textContent = (t === "dark") ? "Light" : "Dark";
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    document.documentElement.dataset.theme = saved;
  } else if (!getTheme()) {
    document.documentElement.dataset.theme = "light";
  }
  applyThemeLabel();
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem("theme", t);
  applyThemeLabel();
}

themeToggleBtn?.addEventListener("click", () => {
  const next = (getTheme() === "dark") ? "light" : "dark";
  setTheme(next);
});

// -------------------- Books / chapters --------------------

async function loadBooks() {
  const books = await fetchJson(`${API}/books`);

  bookSelect.innerHTML = "";
  for (const b of books) {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.title;
    bookSelect.appendChild(opt);
  }

  if (books.length) {
    current.bookId = books[0].id;
    await loadChapters(current.bookId);
  } else {
    titleEl.textContent = "";
    readerEl.innerHTML = "";
    chapterSelect.innerHTML = "";
    current = { bookId: null, chapterId: null, text: "", titleText: "", enSentences: [] };
    hidePopup();
  }
}

async function loadChapters(bookId) {
  const book = await fetchJson(`${API}/books/${bookId}`);

  chapterSelect.innerHTML = "";

  const chapters = Array.isArray(book.chapters) ? book.chapters : [];
  if (!chapters.length) {
    titleEl.textContent = book.title ? `${book.title}` : "";
    readerEl.innerHTML = "";
    current.chapterId = null;
    current.text = "";
    current.titleText = book.title || "";
    current.enSentences = [];
    hidePopup();
    return;
  }

  for (const ch of chapters) {
    const opt = document.createElement("option");
    opt.value = ch.id;
    opt.textContent = ch.title || ch.id;
    chapterSelect.appendChild(opt);
  }

  const firstId = chapters[0].id;
  current.bookId = bookId;
  current.chapterId = firstId;
  chapterSelect.value = firstId;
  hidePopup();
  await loadChapter(bookId, firstId);
}

async function loadChapter(bookId, chapterId) {
  const ch = await fetchJson(`${API}/books/${bookId}/chapters/${chapterId}`);

  const bookTitle = ch.book_title || "";
  const chapterTitle = ch.chapter_title || "";
  const fullTitle =
    bookTitle && chapterTitle ? `${bookTitle} — ${chapterTitle}` : (chapterTitle || bookTitle);

  current.text = ch.text || "";
  current.bookId = bookId;
  current.chapterId = chapterId;
  current.titleText = fullTitle;
  current.enSentences = Array.isArray(ch.en_sentences) ? ch.en_sentences : [];

  hidePopup();
  renderChapter(fullTitle, current.text);
}

bookSelect.addEventListener("change", async () => {
  const bookId = bookSelect.value;
  if (!bookId) return;
  hidePopup();
  await loadChapters(bookId);
});

chapterSelect.addEventListener("change", async () => {
  if (!current.bookId) return;
  const chId = chapterSelect.value;
  if (!chId) return;
  hidePopup();
  await loadChapter(current.bookId, chId);
});

// -------------------- Rendering (Stories) --------------------

function renderChapter(titleText, bodyText) {
  titleEl.innerHTML = "";
  renderCharsInto(titleEl, titleText, 0);

  readerEl.innerHTML = "";
  const paragraphs = splitIntoParagraphsWithOffsets(bodyText);
  for (const pInfo of paragraphs) {
    const p = document.createElement("p");
    p.className = "paragraph";
    renderCharsInto(p, pInfo.text, pInfo.start);
    readerEl.appendChild(p);
  }
}

function splitIntoParagraphsWithOffsets(text) {
  const t = (text || "").replace(/\r\n/g, "\n");
  const re = /([^\n].*?)(?=\n\s*\n+|$)/gs;

  const out = [];
  for (const m of t.matchAll(re)) {
    const paragraphText = m[1];
    const start = m.index ?? 0;
    if (paragraphText.length) out.push({ text: paragraphText, start });
  }
  if (!out.length) return [{ text: "", start: 0 }];
  return out;
}

function renderCharsInto(container, text, baseOffset = 0) {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "\n") {
      const br = document.createElement("br");
      br.dataset.offset = String(baseOffset + i);
      container.appendChild(br);
      continue;
    }

    const span = document.createElement("span");
    span.className = "ch";
    span.dataset.offset = String(baseOffset + i);
    span.textContent = ch;
    container.appendChild(span);
  }
}

// -------------------- English sentence lookup (long press) --------------------

function findEnSentenceByOffset(offset) {
  for (const s of current.enSentences) {
    if (
      typeof s.start === "number" &&
      typeof s.end === "number" &&
      s.start <= offset &&
      offset < s.end
    ) {
      return s;
    }
  }
  return null;
}

let pressTimer = null;
let longPressFired = false;

readerEl.addEventListener("pointerdown", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("ch")) return;

  const offset = Number(target.dataset.offset);
  if (!Number.isFinite(offset)) return;

  longPressFired = false;
  pressTimer = setTimeout(() => {
    longPressFired = true;

    const s = findEnSentenceByOffset(offset);
    if (!s) return;

    popupWord.textContent = "EN";
    popupPinyin.textContent = "";
    popupDefs.textContent = s.en;
    popupDebug.textContent = `en_sentence [${s.start}, ${s.end})`;

    showPopup(e.clientX + 10, e.clientY + 10);
  }, 450);
});

readerEl.addEventListener("pointerup", () => {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
});

readerEl.addEventListener("pointercancel", () => {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
});

readerEl.addEventListener("click", async (e) => {
  if (!current.bookId || !current.chapterId) return;
  if (longPressFired) {
    longPressFired = false;
    return;
  }

  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("ch")) return;

  const offset = Number(target.dataset.offset);
  if (!Number.isFinite(offset)) return;

  const url =
    `${API}/lookup/by_offset?book_id=${encodeURIComponent(current.bookId)}` +
    `&chapter_id=${encodeURIComponent(current.chapterId)}` +
    `&offset=${offset}`;

  const result = await fetchJson(url);
  const word = result?.selected?.text || target.textContent || "";

  popupWord.textContent = word;

  if (result.entry) {
    popupPinyin.textContent = (result.entry.pinyin || []).join(" / ");
    popupDefs.textContent = (result.entry.definitions || []).join("; ");
  } else {
    popupPinyin.textContent = "(no entry)";
    popupDefs.textContent = "";
  }

  popupDebug.textContent = `span [${result.selected.start}, ${result.selected.end}) offset=${offset}`;

  showPopup(e.clientX + 10, e.clientY + 10);
  speak(word);
});

// Title click lookup (requires /lookup/in_text on API)
titleEl.addEventListener("click", async (e) => {
  e.stopPropagation();
  if (!current.titleText) return;

  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("ch")) return;

  const offset = Number(target.dataset.offset);
  if (!Number.isFinite(offset)) return;

  const url = `${API}/lookup/in_text?text=${encodeURIComponent(current.titleText)}&offset=${offset}`;

  const result = await fetchJson(url);
  const word = result?.selected?.text || target.textContent || "";

  popupWord.textContent = word;

  if (result.entry) {
    popupPinyin.textContent = (result.entry.pinyin || []).join(" / ");
    popupDefs.textContent = (result.entry.definitions || []).join("; ");
  } else {
    popupPinyin.textContent = "(no entry)";
    popupDefs.textContent = "";
  }

  popupDebug.textContent = `title span [${result.selected.start}, ${result.selected.end}) offset=${offset}`;
  showPopup(e.clientX + 10, e.clientY + 10);
  speak(word);
});

// -------------------- Vocab helpers --------------------

function getHskLevelFromTags(tags, schema) {
  if (!Array.isArray(tags)) return null;

  const prefix = (schema === "2.0") ? "hsk2.0_" : "hsk3.0_";

  for (const t of tags) {
    if (typeof t !== "string") continue;
    if (!t.startsWith(prefix)) continue;

    const n = parseInt(t.slice(prefix.length), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function ensureVocabCache() {
  if (vocabCache) return vocabCache;

  const [dict, progress] = await Promise.all([
    fetchJson(`${API}/dict`),
    fetchJson(`${API}/progress`),
  ]);

  const learnedMap = (progress && progress.terms) ? progress.terms : {};
  vocabCache = { dict: dict || {}, progress: progress || {}, learnedMap };
  return vocabCache;
}

function setVocabMode(mode) {
  vocabMode = mode;
  vocabSummaryPanel?.classList.toggle("hidden", mode !== "summary");
  vocabLevelPanel?.classList.toggle("hidden", mode !== "level");
  hidePopup();
}

function setFilterActive(btn) {
  filterAllBtn?.classList.remove("is-active");
  filterLearnedBtn?.classList.remove("is-active");
  filterNotLearnedBtn?.classList.remove("is-active");
  btn?.classList.add("is-active");
}

function isLearned(headword, learnedMap) {
  return Boolean(learnedMap?.[headword]?.learned);
}

function normalizeStr(s) {
  return (s || "").toString().toLowerCase();
}

function entryTextForSearch(entry) {
  if (!entry || typeof entry !== "object") return "";
  const p = Array.isArray(entry.pinyin) ? entry.pinyin.join(" ") : "";
  const d = Array.isArray(entry.definitions) ? entry.definitions.join(" ") : "";
  return `${p} ${d}`.trim();
}

// -------------------- Vocab rendering --------------------

async function showVocabSummary() {
  if (!hskCardsEl) return;

  setVocabMode("summary");
  hskCardsEl.innerHTML = `<div class="vocab-note">Loading…</div>`;

  try {
    const { dict, learnedMap } = await ensureVocabCache();

    // For now, UI shows 1..6 cards (works for your current hsk3.0_1..6 and hsk2.0_1..6 tagging)
    const totals = Array.from({ length: 6 }, () => ({ total: 0, learned: 0 }));

    for (const [headword, entry] of Object.entries(dict || {})) {
      const lvl = getHskLevelFromTags(entry?.tags, hskSchema);
      if (!lvl) continue;
      if (lvl < 1 || lvl > 6) continue;

      totals[lvl - 1].total += 1;
      if (isLearned(headword, learnedMap)) totals[lvl - 1].learned += 1;
    }

    hskCardsEl.innerHTML = "";
    for (let i = 1; i <= 6; i++) {
      const { total, learned } = totals[i - 1];
      const pct = total ? Math.round((learned / total) * 100) : 0;

      const card = document.createElement("div");
      card.className = "hsk-card";
      card.dataset.hsk = String(i);

      card.innerHTML = `
        <h3>HSK ${i}</h3>
        <div class="hsk-metrics">
          <div>${learned}/${total}</div>
          <div class="pct">${pct}%</div>
        </div>
        <div class="vocab-note" style="margin-top:8px;">${hskSchema} tags</div>
      `;

      card.addEventListener("click", async (e) => {
        e.stopPropagation();
        await showVocabLevel(i);
      });

      hskCardsEl.appendChild(card);
    }
  } catch (e) {
    console.error(e);
    hskCardsEl.innerHTML = `<div class="vocab-note">Failed to load /dict or /progress from API.</div>`;
  }
}

async function showVocabLevel(level) {
  activeHskLevel = level;
  vocabQuery = "";
  if (vocabSearchEl) vocabSearchEl.value = "";
  vocabFilter = "all";
  setFilterActive(filterAllBtn);

  setVocabMode("level");

  if (vocabLevelTitle) vocabLevelTitle.textContent = `HSK ${level}`;
  if (vocabLevelMeta) vocabLevelMeta.textContent = "Loading…";
  if (vocabListEl) vocabListEl.innerHTML = "";

  const { dict, learnedMap } = await ensureVocabCache();

  const words = [];
  for (const [headword, entry] of Object.entries(dict || {})) {
    const lvl = getHskLevelFromTags(entry?.tags, hskSchema);
    if (lvl === level) words.push(headword);
  }

  words.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  const learnedCount = words.reduce((acc, w) => acc + (isLearned(w, learnedMap) ? 1 : 0), 0);
  if (vocabLevelMeta) vocabLevelMeta.textContent = `${learnedCount}/${words.length} learned • HSK ${hskSchema}`;

  renderVocabList(words, dict, learnedMap);
}

function renderVocabList(words, dict, learnedMap) {
  if (!vocabListEl) return;

  const q = normalizeStr(vocabQuery);
  const filtered = [];

  for (const w of words) {
    const learned = isLearned(w, learnedMap);

    if (vocabFilter === "learned" && !learned) continue;
    if (vocabFilter === "not" && learned) continue;

    if (q) {
      const entry = dict[w];
      const hay = `${w} ${entryTextForSearch(entry)}`;
      if (!normalizeStr(hay).includes(q)) continue;
    }

    filtered.push(w);
  }

  vocabListEl.innerHTML = "";

  if (!filtered.length) {
    vocabListEl.innerHTML = `<div class="vocab-note" style="padding:12px;">No matches.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  for (const w of filtered) {
    const entry = dict[w];
    const learned = isLearned(w, learnedMap);

    const pinyin = (entry && typeof entry === "object" && Array.isArray(entry.pinyin))
      ? entry.pinyin.join(" / ")
      : "";

    const defs = (entry && typeof entry === "object" && Array.isArray(entry.definitions))
      ? entry.definitions.join("; ")
      : "";

    const row = document.createElement("div");
    row.className = "vocab-row";

    const left = document.createElement("div");
    left.className = "vocab-left";

    const wordEl = document.createElement("div");
    wordEl.className = "vocab-word";
    wordEl.textContent = w;

    const subEl = document.createElement("div");
    subEl.className = "vocab-sub";
    subEl.textContent = pinyin || (entry ? "" : "(missing entry)");

    left.appendChild(wordEl);
    if (subEl.textContent) left.appendChild(subEl);

    const badge = document.createElement("div");
    badge.className = `badge ${learned ? "learned" : "notlearned"}`;
    badge.textContent = learned ? "Learned" : "Not learned";

    row.appendChild(left);
    row.appendChild(badge);

    row.addEventListener("click", (e) => {
      e.stopPropagation();

      popupWord.textContent = w;
      popupPinyin.textContent = pinyin || "(no pinyin)";
      popupDefs.textContent = defs || "(no definition)";
      popupDebug.textContent = `HSK ${activeHskLevel} • HSK ${hskSchema} • ${learned ? "learned" : "not learned"}`;

      showPopup(e.clientX + 10, e.clientY + 10);
      speak(w);
    });

    frag.appendChild(row);
  }

  vocabListEl.appendChild(frag);
}

// -------------------- Vocab controls wiring --------------------

vocabBackBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  showVocabSummary();
});

filterAllBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  vocabFilter = "all";
  setFilterActive(filterAllBtn);
  if (activeHskLevel) {
    ensureVocabCache().then(({ dict, learnedMap }) => {
      const words = [];
      for (const [headword, entry] of Object.entries(dict || {})) {
        if (getHskLevelFromTags(entry?.tags, hskSchema) === activeHskLevel) words.push(headword);
      }
      words.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
      renderVocabList(words, dict, learnedMap);
    });
  }
});

filterLearnedBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  vocabFilter = "learned";
  setFilterActive(filterLearnedBtn);
  filterAllBtn?.dispatchEvent(new Event("click"));
});

filterNotLearnedBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  vocabFilter = "not";
  setFilterActive(filterNotLearnedBtn);
  filterAllBtn?.dispatchEvent(new Event("click"));
});

vocabSearchEl?.addEventListener("input", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  vocabQuery = t.value || "";
  filterAllBtn?.dispatchEvent(new Event("click"));
});

// -------------------- Boot --------------------

initTheme();
loadHskSchema();

(async function boot() {
  try {
    await loadBooks();
    await setView("stories");
    console.log("boot ok");
  } catch (err) {
    console.error(err);
    alert(String(err));
  }
})();