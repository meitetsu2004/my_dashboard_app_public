import { openModal, closeModal } from "./modalUtils.js";

const API_BASE = "/api/english";
let englishModalRef = null;

const TEMPLATE = `
  <div class="modal-panel" role="dialog" aria-modal="true">
    <header class="modal-header">
      <div>
        <h3 class="modal-title">English Vocabulary</h3>
      </div>
      <button class="modal-close" data-modal-close aria-label="Close">×</button>
    </header>

    <div class="modal-tabs">
      <button class="modal-tab" id="tab-test" onclick="renderTab('test')">Daily Test</button>
      <button class="modal-tab" id="tab-register" onclick="renderTab('register')">Register Word</button>
      <button class="modal-tab" id="tab-list" onclick="renderTab('list')">Word List</button>
    </div>

    <div id="english-modal-body" class="modal-body" style="min-height: 400px; padding-bottom: 40px;">
      <!-- Content injected here -->
    </div>
  </div>
`;

const ensureModal = () => {
  if (englishModalRef) return englishModalRef;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = TEMPLATE;
  document.body.appendChild(backdrop);

  const close = () => {
    backdrop.classList.remove("is-visible");
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") close();
  };
  window.addEventListener("keydown", handleKeydown);

  backdrop.addEventListener("click", (event) => {
    if (
      event.target === backdrop ||
      event.target.closest("[data-modal-close]")
    ) {
      close();
    }
  });

  englishModalRef = { backdrop, close };
  return englishModalRef;
};

export const openEnglishModal = (initialTab = "register") => {
  const { backdrop } = ensureModal();
  backdrop.classList.add("is-visible");

  // Expose renderTab globally
  window.renderTab = renderTab;

  renderTab(initialTab);
};

const renderTab = (tabName) => {
  const container = document.getElementById("english-modal-body");

  container.innerHTML = '<div class="loading">Loading...</div>';

  if (tabName === "register") {
    renderRegister(container);
  } else if (tabName === "test") {
    renderTest(container);
  } else if (tabName === "list") {
    renderList(container);
  }
};

// --- Register Tab ---
const renderRegister = (container) => {
  container.innerHTML = `
    <div class="calc-form">
      <div class="form-field">
        <label>New Word / Phrase</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="word-input" placeholder="Enter word to learn..." style="flex: 1;">
          <button class="primary-button" id="btn-generate">Generate & Save</button>
        </div>
      </div>

      <div class="form-field" style="margin-top: 12px;">
        <label>Memo (Optional)</label>
        <textarea id="memo-input" placeholder="Add your own notes, explanation, or context..." style="min-height: 60px;"></textarea>
      </div>
      
      <div id="error-message" class="modal-status" data-state="error" style="display: none; margin-top: 12px;"></div>

      <div id="generation-result" style="display: none;">
        <div class="modal-placeholder-grid">
          <div class="modal-placeholder-card">
            <p class="label">Meaning</p>
            <p class="value" id="res-meaning"></p>
          </div>
          <div class="modal-placeholder-card">
            <p class="label">Pronunciation</p>
            <p class="value" id="res-pronunciation"></p>
          </div>
        </div>
        <div class="modal-placeholder-card" style="margin-top: 12px;">
          <p class="label">Example</p>
          <p class="value" id="res-example-en"></p>
          <p class="value" id="res-example-jp" style="color: var(--muted); font-weight: 400; font-size: 0.9rem;"></p>
        </div>
        <div class="modal-status" data-state="success" style="margin-top: 12px;">
          ✓ Successfully registered!
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("btn-generate")
    .addEventListener("click", async () => {
      const wordInput = document.getElementById("word-input");
      const word = wordInput.value.trim();
      if (!word) return;

      const btn = document.getElementById("btn-generate");
      const resultArea = document.getElementById("generation-result");
      const errorArea = document.getElementById("error-message");

      btn.disabled = true;
      btn.textContent = "Generating...";
      resultArea.style.display = "none";
      errorArea.style.display = "none";

      try {
        const memo = document.getElementById("memo-input").value.trim();
        const res = await fetch(`${API_BASE}/register`, {
          method: "POST",
          body: JSON.stringify({ word, memo }),
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        // Show result
        document.getElementById("res-meaning").textContent = data.data.meaning;
        document.getElementById("res-pronunciation").textContent =
          data.data.pronunciation;
        document.getElementById("res-example-en").textContent =
          data.data.example_en;
        document.getElementById("res-example-jp").textContent =
          data.data.example_jp;

        resultArea.style.display = "block";
        wordInput.value = "";
        document.getElementById("memo-input").value = "";
      } catch (e) {
        errorArea.textContent = `Error: ${e.message}`;
        errorArea.style.display = "block";
      } finally {
        btn.disabled = false;
        btn.textContent = "Generate & Save";
      }
    });
};

// --- List Tab ---
const renderList = async (container) => {
  try {
    const res = await fetch(`${API_BASE}/list?t=${Date.now()}`);
    const words = await res.json();

    if (words.length === 0) {
      container.innerHTML =
        '<p class="muted" style="text-align: center; padding: 40px;">No words registered yet.</p>';
      return;
    }

    const html = words
      .map(
        (word) => `
      <div class="word-card" onclick="openWordDetail(${word.id})">
        <div class="favorite-star ${
          word.is_favorite ? "is-active" : ""
        }" onclick="event.stopPropagation(); toggleFavorite(${word.id})">★</div>
        <div class="word-card__header" style="padding-right: 24px;"> <!-- Add padding to avoid overlap -->
          <div class="word-card__word">${word.word}</div>
        </div>
        <div style="margin-bottom: 8px;">
          <div class="pill-inline" style="background: ${getStatusColor(
            word.status
          )}20; color: ${getStatusColor(word.status)}">
            ${word.status}
          </div>
        </div>
        <div class="word-card__meaning">${word.meaning}</div>
        ${word.memo ? `<div class="word-card__memo">${word.memo}</div>` : ""}
        <div class="word-card__meta">
          <span>#${String(word.id).padStart(3, "0")}</span>
          <span>${new Date(word.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `
      )
      .join("");

    container.innerHTML = `<div class="word-grid">${html}</div>`;

    // Store words for detail view
    window.currentWords = words;
  } catch (e) {
    container.innerHTML = `<div class="modal-status" data-state="error">Error: ${e.message}</div>`;
  }
};

// --- Actions ---
window.toggleFavorite = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/word/${id}/favorite`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      // Update local state and UI
      const word = window.currentWords.find((w) => w.id === id);
      if (word) word.is_favorite = data.is_favorite;
      renderTab("list"); // Re-render to show change
    }
  } catch (e) {
    console.error("Failed to toggle favorite", e);
  }
};

// --- Detail View ---
window.openWordDetail = (wordId) => {
  const word = window.currentWords.find((w) => w.id === wordId);
  if (!word) return;

  const container = document.getElementById("english-modal-body");

  container.innerHTML = `
    <div class="word-detail" style="position: relative;">
      <button class="back-button" onclick="renderTab('list')">
        <span>←</span> Back to List
      </button>
      
      <div class="favorite-star ${word.is_favorite ? "is-active" : ""}" 
           style="top: 0; right: 0;" 
           onclick="toggleFavorite(${
             word.id
           }); this.classList.toggle('is-active');">★</div>
      
      <div class="detail-header">
        <h2 class="detail-word">${word.word}</h2>
        <div class="detail-pronunciation">${word.pronunciation || ""}</div>
      </div>
      
      <div class="detail-section">
        <div class="detail-label">Meaning</div>
        <input class="detail-input" id="edit-meaning" value="${word.meaning}">
      </div>
      
      <div class="detail-section">
        <div class="detail-label">Example (EN)</div>
        <textarea class="detail-textarea" id="edit-example-en">${
          word.example_en || ""
        }</textarea>
      </div>
      
      <div class="detail-section">
        <div class="detail-label">Example (JP)</div>
        <input class="detail-input" id="edit-example-jp" value="${
          word.example_jp || ""
        }">
      </div>
      
      <div class="detail-section">
        <div class="detail-label">Memo</div>
        <textarea class="detail-textarea" id="edit-memo" placeholder="Add a memo...">${
          word.memo || ""
        }</textarea>
      </div>
      
      <div class="detail-section" style="margin-top: 12px;">
        <div class="detail-label">Status</div>
        <select class="detail-input" id="edit-status">
          <option value="new" ${
            word.status === "new" ? "selected" : ""
          }>New</option>
          <option value="learning" ${
            word.status === "learning" ? "selected" : ""
          }>Learning</option>
          <option value="mastered" ${
            word.status === "mastered" ? "selected" : ""
          }>Mastered</option>
        </select>
      </div>
      
      <div class="detail-actions">
        <button class="btn-delete" onclick="deleteWord(${
          word.id
        })">Delete Word</button>
        <button class="btn-save" onclick="saveWord(${
          word.id
        })">Save Changes</button>
      </div>
    </div>
  `;
};

window.saveWord = async (id) => {
  const data = {
    word: window.currentWords.find((w) => w.id === id).word,
    meaning: document.getElementById("edit-meaning").value,
    pronunciation: window.currentWords.find((w) => w.id === id).pronunciation,
    example_en: document.getElementById("edit-example-en").value,
    example_jp: document.getElementById("edit-example-jp").value,
    memo: document.getElementById("edit-memo").value,
    status: document.getElementById("edit-status").value,
  };

  try {
    const res = await fetch(`${API_BASE}/word/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      renderTab("list");
    } else {
      alert("Failed to save changes");
    }
  } catch (e) {
    console.error("Error saving word", e);
    alert("Error saving word");
  }
};

window.deleteWord = async (id) => {
  if (!confirm("Are you sure you want to delete this word?")) return;

  try {
    const res = await fetch(`${API_BASE}/word/${id}`, { method: "DELETE" });
    if (res.ok) {
      renderTab("list");
    } else {
      alert("Failed to delete word");
    }
  } catch (e) {
    console.error("Error deleting word", e);
    alert("Error deleting word");
  }
};

const getStatusColor = (status) => {
  if (status === "mastered") return "#58d68d";
  if (status === "learning") return "#ffb04c";
  return "#6c8cff"; // new
};

// --- Test Tab ---
const renderTest = async (container) => {
  try {
    const res = await fetch(`${API_BASE}/test?limit=10`);
    const words = await res.json();

    if (words.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">🎉</div>
          <h3>All caught up!</h3>
          <p class="muted">No words to review for today.</p>
        </div>
      `;
      return;
    }

    let currentIndex = 0;

    const showCard = (index) => {
      if (index >= words.length) {
        renderTest(container); // Reload to show "All caught up"
        return;
      }

      const word = words[index];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <span class="muted">Review ${index + 1} / ${words.length}</span>
          <span class="pill-inline">Level ${word.level}</span>
        </div>
        
        <div class="flashcard" id="flashcard">
          <div class="flashcard-front">
            <h2 style="font-size: 2.5rem; margin: 0;">${word.word}</h2>
            <p class="muted" style="margin-top: 10px;">Click to flip</p>
          </div>
          <div class="flashcard-back" style="display: none;">
            <h2 style="font-size: 2rem; margin: 0 0 10px;">${word.word}</h2>
            <p style="font-size: 1.2rem; margin-bottom: 4px;">${
              word.meaning
            }</p>
            <p class="muted">${word.pronunciation || ""}</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="font-style: italic;">"${word.example_en}"</p>
              <p class="muted">${word.example_jp}</p>
            </div>
          </div>
        </div>
        
        <div class="action-row" id="test-actions" style="justify-content: center; gap: 16px; margin-top: 30px; visibility: hidden;">
          <button class="secondary-button" style="border-color: #ff7b7b; color: #ff7b7b;" onclick="submitReview(${
            word.id
          }, 'ng')">Forgot</button>
          <button class="secondary-button" style="border-color: #ffb04c; color: #ffb04c;" onclick="submitReview(${
            word.id
          }, 'ambiguous')">Ambiguous</button>
          <button class="secondary-button" style="border-color: #58d68d; color: #58d68d;" onclick="submitReview(${
            word.id
          }, 'ok')">Mastered</button>
        </div>
      `;

      const card = document.getElementById("flashcard");
      card.addEventListener("click", () => {
        card.querySelector(".flashcard-front").style.display = "none";
        card.querySelector(".flashcard-back").style.display = "block";
        document.getElementById("test-actions").style.visibility = "visible";
      });
    };

    window.submitReview = async (id, result) => {
      await fetch(`${API_BASE}/review`, {
        method: "POST",
        body: JSON.stringify({ id, result }),
      });
      currentIndex++;
      showCard(currentIndex);
    };

    showCard(0);
  } catch (e) {
    container.innerHTML = `<p class="error">Error loading test: ${e.message}</p>`;
  }
};
