(function () {
  const STORAGE_KEY = "ranking-time-records";
  const ADMIN_KEY = "ranking-is-admin";

  const form = document.getElementById("record-form");
  const nameInput = document.getElementById("name");
  const minutesInput = document.getElementById("minutes");
  const secondsInput = document.getElementById("seconds");
  const rankingList = document.getElementById("ranking-list");
  const championZone = document.getElementById("champion-zone");
  const emptyState = document.getElementById("empty-state");
  const recordCount = document.getElementById("record-count");
  const btnClearAll = document.getElementById("btn-clear-all");
  const btnSubmit = document.getElementById("btn-submit");
  const adminToggle = document.getElementById("admin-toggle");
  const adminPanel = document.getElementById("admin-panel");

  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function isAdminMode() {
    return sessionStorage.getItem(ADMIN_KEY) === "1";
  }

  function setAdminMode(on) {
    if (on) sessionStorage.setItem(ADMIN_KEY, "1");
    else sessionStorage.removeItem(ADMIN_KEY);
    document.body.classList.toggle("is-admin", on);
    adminToggle.setAttribute("aria-pressed", on ? "true" : "false");
    adminToggle.textContent = on ? "관리자 모드 끄기" : "관리자 모드";
    adminPanel.hidden = !on;
    const inputs = [nameInput, minutesInput, secondsInput, btnSubmit, btnClearAll];
    inputs.forEach((el) => {
      el.disabled = !on;
    });
  }

  function parseTimeSeconds() {
    const m = parseFloat(minutesInput.value);
    const s = parseFloat(secondsInput.value);
    const min = Number.isFinite(m) && m >= 0 ? m : 0;
    const sec = Number.isFinite(s) && s >= 0 ? s : 0;
    return min * 60 + sec;
  }

  function formatTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0.000초";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds - mins * 60;
    if (mins === 0) return `${secs.toFixed(3)}초`;
    return `${mins}분 ${secs.toFixed(3)}초`;
  }

  function assignRanks(sorted) {
    const out = [];
    let prev = null;
    let rank = 0;
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i].timeSeconds;
      if (prev === null || t !== prev) {
        rank = i + 1;
        prev = t;
      }
      out.push({ ...sorted[i], rank });
    }
    return out;
  }

  function renderChampions(champions, admin) {
    championZone.innerHTML = "";
    if (!champions.length) {
      championZone.hidden = true;
      return;
    }
    championZone.hidden = false;

    champions.forEach((r) => {
      const card = document.createElement("article");
      card.className = "champion-card";

      const badge = document.createElement("div");
      badge.className = "champion-badge";
      badge.textContent = champions.length > 1 ? "공동 1위" : "1위";

      const nameEl = document.createElement("h3");
      nameEl.className = "champion-name";
      nameEl.textContent = r.name || "(이름 없음)";

      const timeEl = document.createElement("div");
      timeEl.className = "champion-time";
      timeEl.textContent = formatTime(r.timeSeconds);

      const meta = document.createElement("div");
      meta.className = "champion-meta";

      if (admin) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn-icon";
        del.setAttribute("aria-label", "이 기록 삭제");
        del.textContent = "삭제";
        del.addEventListener("click", () => {
          const next = loadRecords().filter((x) => x.id !== r.id);
          saveRecords(next);
          render();
        });
        meta.appendChild(del);
      }

      card.appendChild(badge);
      card.appendChild(nameEl);
      card.appendChild(timeEl);
      if (meta.childNodes.length) card.appendChild(meta);
      championZone.appendChild(card);
    });
  }

  function render() {
    const admin = isAdminMode();
    const records = loadRecords();
    const sorted = [...records].sort((a, b) => b.timeSeconds - a.timeSeconds);
    const ranked = assignRanks(sorted);
    const champions = ranked.filter((x) => x.rank === 1);
    const rest = ranked.filter((x) => x.rank > 1);

    renderChampions(champions, admin);

    rankingList.innerHTML = "";
    rest.forEach((r) => {
      const li = document.createElement("li");
      const tier = r.rank === 2 ? "rank-2" : r.rank === 3 ? "rank-3" : "";
      li.className = tier;
      li.dataset.id = r.id;

      const rankEl = document.createElement("span");
      rankEl.className = "rank-num";
      rankEl.textContent = String(r.rank);

      const nameEl = document.createElement("span");
      nameEl.className = "rank-name";
      nameEl.textContent = r.name || "(이름 없음)";

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "0.5rem";

      const timeEl = document.createElement("span");
      timeEl.className = "rank-time";
      timeEl.textContent = formatTime(r.timeSeconds);

      right.appendChild(timeEl);
      if (admin) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn-icon";
        del.setAttribute("aria-label", "이 기록 삭제");
        del.textContent = "삭제";
        del.addEventListener("click", () => {
          const next = loadRecords().filter((x) => x.id !== r.id);
          saveRecords(next);
          render();
        });
        right.appendChild(del);
      }

      li.appendChild(rankEl);
      li.appendChild(nameEl);
      li.appendChild(right);
      rankingList.appendChild(li);
    });

    const n = records.length;
    recordCount.textContent = `${n}명`;
    const showEmpty = n === 0;
    emptyState.classList.toggle("hidden", !showEmpty);
  }

  adminToggle.addEventListener("click", () => {
    setAdminMode(!isAdminMode());
    render();
    if (isAdminMode()) nameInput.focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isAdminMode()) return;

    const total = parseTimeSeconds();
    if (total <= 0) {
      alert("0보다 큰 시간을 입력해 주세요.");
      return;
    }

    const name = (nameInput.value || "").trim();
    const records = loadRecords();
    records.push({
      id: crypto.randomUUID(),
      name: name.slice(0, 40),
      timeSeconds: total,
      createdAt: Date.now(),
    });
    saveRecords(records);

    minutesInput.value = "";
    secondsInput.value = "";
    nameInput.focus();
    render();
  });

  btnClearAll.addEventListener("click", () => {
    if (!isAdminMode()) return;
    if (!loadRecords().length) return;
    if (confirm("모든 기록을 삭제할까요?")) {
      saveRecords([]);
      render();
    }
  });

  setAdminMode(isAdminMode());
  render();
})();
