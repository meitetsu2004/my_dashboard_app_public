const API_BASE = window.__CALC_API_BASE__ || window.location.origin;

const CATEGORY_LABELS = {
  limits: "極限",
  differentiation: "微分",
  integration_easy: "積分(基礎)",
  integration: "積分",
};

const TEMPLATE = `
  <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="calc-modal-title">
    <header class="modal-header">
      <div>
        <h3 id="calc-modal-title">計算プリント作成</h3>
      </div>
      <button class="modal-close" data-modal-close aria-label="閉じる">×</button>
    </header>

    <div class="modal-body">
      <form class="calc-form" data-config-form>
        <section>
          <div class="form-grid">
            <label class="form-field">
              <span>開始日</span>
              <input type="date" name="start_date" />
            </label>
            <label class="form-field">
              <span>回数 (第〇回)</span>
              <input type="number" min="1" name="edition" />
            </label>
          </div>
        </section>

        <section>
          <label class="form-field">
            <span>連絡事項 (1 行につき 1 つ)</span>
            <textarea name="notes" rows="3" placeholder="連絡事項を1行ずつ入力"></textarea>
          </label>
        </section>

        <section>
          <div class="section-header">
            <h4>カテゴリ別設定</h4>
            <p class="section-subtitle">1日あたりの問題数と難易度レンジ</p>
          </div>
          <div class="category-table" data-category-grid></div>
        </section>
      </form>
      <div class="modal-status" data-modal-status></div>
    </div>

    <div class="modal-actions">
      <button class="ghost-button" data-modal-close>閉じる</button>
      <button class="secondary-button" data-config-save>設定を保存</button>
      <button class="primary-button" data-modal-run>生成を実行</button>
    </div>
  </div>
`;

let calcModalRef = null;

const setStatus = (backdrop, message, type = "info") => {
  const el = backdrop.querySelector("[data-modal-status]");
  if (!el) return;
  el.textContent = message || "";
  el.dataset.state = type;
};

const renderOutputLinks = (backdrop, info) => {
  const el = backdrop.querySelector("[data-modal-status]");
  if (!el) return;
  const { pdf_path: pdfPath } = info || {};

  if (!pdfPath) {
    el.innerHTML = `<p class="muted">出力パスを取得できませんでした。サーバーログをご確認ください。</p>`;
    return;
  }

  el.innerHTML = `
    <div>生成が完了しました</div>
    <p class="muted">パスは ${pdfPath} です。</p>
    <div class="output-links">
      <button class="secondary-button small" data-open-path="${pdfPath}">Finderで開く</button>
    </div>
  `;

  const openBtn = el.querySelector("[data-open-path]");
  if (openBtn) {
    openBtn.addEventListener("click", async () => {
      try {
        openBtn.disabled = true;
        const res = await fetch(`${API_BASE}/api/open-path`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pdfPath }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.error)
          throw new Error(body.error || "open に失敗しました");
        openBtn.textContent = "開きました";
        setTimeout(() => (openBtn.textContent = "Finderで開く"), 1200);
      } catch (error) {
        console.error(error);
        setStatus(backdrop, error.message, "error");
      } finally {
        openBtn.disabled = false;
      }
    });
  }
};

const validateForm = (backdrop) => {
  const form = backdrop.querySelector("[data-config-form]");
  if (!form) return { ok: false, message: "フォームが見つかりません" };

  const startDate = form.start_date.value.trim();
  const edition = Number(form.edition.value) || 0;

  if (!startDate) return { ok: false, message: "開始日を入力してください" };
  if (edition < 1)
    return { ok: false, message: "回数は1以上を入力してください" };

  let hasAnyCount = false;
  let categoryError = "";

  backdrop.querySelectorAll("[data-category-row]").forEach((row) => {
    const key = row.getAttribute("data-key");
    const perDay = Number(row.querySelector('[name="per_day"]').value) || 0;
    const minLevel =
      Number(row.querySelector('[name="min_difficulty"]').value) || 1;
    const maxLevel =
      Number(row.querySelector('[name="max_difficulty"]').value) || 5;

    if (perDay > 0) hasAnyCount = true;
    if (minLevel > maxLevel) {
      categoryError = `${
        CATEGORY_LABELS[key] || key
      } の難易度設定を確認してください（最低 > 最高）`;
    }
  });

  if (categoryError) return { ok: false, message: categoryError };
  if (!hasAnyCount)
    return {
      ok: false,
      message: "少なくとも1カテゴリで1日あたりの問題数を設定してください",
    };

  return { ok: true };
};

const buildCategoryRows = (grid, categories) => {
  grid.innerHTML = Object.entries(CATEGORY_LABELS)
    .map(([key, label]) => {
      const config = categories?.[key] || {};
      const perDay = config.per_day ?? config.count ?? 0;
      const minLevel = config.min_difficulty ?? 1;
      const maxLevel = config.max_difficulty ?? 5;
      return `
        <div class="category-row" data-category-row data-key="${key}">
          <div class="category-row__label">${label}</div>
          <label>
            <span>1日あたりの問題数</span>
            <select name="per_day">
              ${Array.from(
                { length: 11 },
                (_, v) =>
                  `<option value="${v}" ${
                    perDay === v ? "selected" : ""
                  }>${v}</option>`
              ).join("")}
            </select>
          </label>
          <label>
            <span>最低難易度</span>
            <select name="min_difficulty">
              ${Array.from({ length: 5 }, (_, i) => {
                const v = i + 1;
                return `<option value="${v}" ${
                  minLevel === v ? "selected" : ""
                }>${v}</option>`;
              }).join("")}
            </select>
          </label>
          <label>
            <span>最高難易度</span>
            <select name="max_difficulty">
              ${Array.from({ length: 5 }, (_, i) => {
                const v = i + 1;
                return `<option value="${v}" ${
                  maxLevel === v ? "selected" : ""
                }>${v}</option>`;
              }).join("")}
            </select>
          </label>
        </div>
      `;
    })
    .join("");
};

const populateForm = (backdrop, config) => {
  const form = backdrop.querySelector("[data-config-form]");
  if (!form) return;
  const startDate = config.scheduler?.start_date ?? "";
  const normalized = startDate.includes("/")
    ? startDate.replaceAll("/", "-")
    : startDate;
  form.start_date.value = normalized;
  form.edition.value = config.scheduler?.edition ?? 1;
  const notes = config.scheduler?.notes;
  form.notes.value = Array.isArray(notes) ? notes.join("\n") : notes ?? "";
  const grid = backdrop.querySelector("[data-category-grid]");
  buildCategoryRows(grid, config.categories);
};

const serializeForm = (backdrop) => {
  const form = backdrop.querySelector("[data-config-form]");
  const scheduler = {
    start_date: form.start_date.value.trim(),
    edition: Number(form.edition.value) || 1,
    num_days: loadCachedConfig.scheduler?.num_days || 7,
    notes: form.notes.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  };

  const categories = {};
  backdrop.querySelectorAll("[data-category-row]").forEach((row) => {
    const key = row.getAttribute("data-key");
    const perDay = Number(row.querySelector('[name="per_day"]').value) || 0;
    const minLevel =
      Number(row.querySelector('[name="min_difficulty"]').value) || 1;
    const maxLevel =
      Number(row.querySelector('[name="max_difficulty"]').value) || 5;
    categories[key] = {
      per_day: perDay,
      min_difficulty: minLevel,
      max_difficulty: maxLevel,
    };
  });

  return {
    scheduler: {
      ...scheduler,
      start_date: scheduler.start_date.replace(/-/g, "/"),
    },
    output: loadCachedConfig.output,
    categories,
  };
};

let loadCachedConfig = {
  output: { directory: "calculation_practice_program/output" },
};

const fetchConfig = async () => {
  const res = await fetch(`${API_BASE}/api/calc-config`);
  if (!res.ok) throw new Error("設定の取得に失敗しました");
  return res.json();
};

const saveConfig = async (data) => {
  const res = await fetch(`${API_BASE}/api/calc-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "設定の保存に失敗しました");
  }
};

const runGeneration = async () => {
  const res = await fetch(`${API_BASE}/api/calc-run`, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(body.error || "生成に失敗しました");
  }
  return body;
};

const ensureModal = () => {
  if (calcModalRef) return calcModalRef;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = TEMPLATE;
  document.body.appendChild(backdrop);

  const closeModal = () => {
    backdrop.classList.remove("is-visible");
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") closeModal();
  };
  window.addEventListener("keydown", handleKeydown);

  backdrop.addEventListener("click", (event) => {
    if (
      event.target === backdrop ||
      event.target.closest("[data-modal-close]")
    ) {
      closeModal();
    }
  });

  const saveBtn = backdrop.querySelector("[data-config-save]");
  const runBtn = backdrop.querySelector("[data-modal-run]");

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        saveBtn.disabled = true;
        const validation = validateForm(backdrop);
        if (!validation.ok) {
          setStatus(backdrop, validation.message, "error");
          return;
        }
        setStatus(backdrop, "設定を保存しています...");
        const payload = serializeForm(backdrop);
        await saveConfig(payload);
        loadCachedConfig = payload;
        setStatus(backdrop, "保存しました", "success");
      } catch (error) {
        console.error(error);
        setStatus(backdrop, error.message, "error");
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  if (runBtn) {
    runBtn.addEventListener("click", async () => {
      try {
        runBtn.disabled = true;
        const validation = validateForm(backdrop);
        if (!validation.ok) {
          setStatus(backdrop, validation.message, "error");
          return;
        }
        setStatus(backdrop, "生成中です...(数十秒かかる場合があります)");
        const result = await runGeneration();
        setStatus(backdrop, "生成が完了しました", "success");
        renderOutputLinks(backdrop, result);
      } catch (error) {
        console.error(error);
        setStatus(backdrop, error.message, "error");
      } finally {
        runBtn.disabled = false;
      }
    });
  }

  calcModalRef = { backdrop, closeModal };
  return calcModalRef;
};

export const openCalcModal = async () => {
  const { backdrop } = ensureModal();
  backdrop.classList.add("is-visible");
  setStatus(backdrop, "設定を読み込んでいます...");
  try {
    const config = await fetchConfig();
    loadCachedConfig = config;
    populateForm(backdrop, config);
    setStatus(backdrop, "設定を読み込みました", "success");
  } catch (error) {
    console.error(error);
    setStatus(backdrop, error.message, "error");
  }
};
