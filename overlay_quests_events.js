"use strict";

(function () {
  // Start: próbujemy się inicjalizować, dopóki UI nie będzie gotowe
  function tryInit(retries) {
    const overlay = window.TFExt;
    if (!overlay || typeof overlay.shouldRun !== "function" || !overlay.shouldRun()) {
      return;
    }

    const els = overlay.questElements;
    if (!overlay.questHost || !overlay.questShadow || !els || !els.wrap) {
      // UI jeszcze nie gotowe – spróbuj ponownie za chwilę
      if ((retries || 0) < 20) {
        setTimeout(() => tryInit((retries || 0) + 1), 150);
      }
      return;
    }

    initQuestTrackerEvents(overlay, els).catch((err) => {
      console.error("[Tidefall QuestTracker] init failed", err);
    });
  }

  async function initQuestTrackerEvents(overlay, els) {
    const host = overlay.questHost;

    const initialState = await overlay.getState();
    const quests = normalizeQuests(initialState.quests);
    const position = normalizePosition(initialState.questTrackerPosition, {
      top: 120,
      left: 340
    });
    const isHidden = !!initialState.questTrackerHidden;

    positionHost(host, position);
    if (isHidden) {
      els.wrap.style.display = "none";
    }

    renderAll();

    setupTabs(els);
    setupForm(els, quests, persistState, renderAll);
    setupActiveListActions(els, quests, persistState, renderAll);
    setupCompletedListActions(els, quests, persistState, renderAll);
    setupDragging(host, els, persistState);
    setupCloseToggle(els, persistState);

    async function persistState(extra) {
      const top = parseInt(host.style.top, 10) || position.top;
      const left = parseInt(host.style.left, 10) || position.left;

      await overlay.setState({
        quests,
        questTrackerPosition: { top, left },
        questTrackerHidden: els.wrap.style.display === "none",
        ...(extra || {})
      });
    }

    function renderAll() {
      renderList(els.activeList, els.emptyActive, quests.active, "active");
      renderList(els.completedList, els.emptyCompleted, quests.completed, "completed");
    }
  }

  // --- HELPERY STANU ---

  function normalizeQuests(raw) {
    const base = { active: [], completed: [] };
    if (!raw || typeof raw !== "object") return base;

    const normList = (list) => {
      if (!Array.isArray(list)) return [];
      return list
        .filter((q) => q && typeof q === "object" && q.title)
      .map((q) => ({
        id: String(q.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        title: String(q.title).slice(0, 200),
        questGiver: q.questGiver ? String(q.questGiver).slice(0, 200) : "",
        reward: q.reward ? String(q.reward).slice(0, 200) : "",
        description: q.description ? String(q.description).slice(0, 1000) : "",
        createdAt: typeof q.createdAt === "number" ? q.createdAt : Date.now(),
        completedAt: typeof q.completedAt === "number" ? q.completedAt : undefined
      }));
    };

    base.active = normList(raw.active);
    base.completed = normList(raw.completed);
    return base;
  }

  function normalizePosition(raw, fallback) {
    if (!raw || typeof raw !== "object") return fallback;
    const top = Number.isFinite(raw.top) ? raw.top : fallback.top;
    const left = Number.isFinite(raw.left) ? raw.left : fallback.left;
    return { top, left };
  }

  // --- RENDER / FORMAT ---

  function positionHost(host, pos) {
    host.style.top = `${pos.top}px`;
    host.style.left = `${pos.left}px`;
  }

  function formatShortDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}.${d.getFullYear()}`;
  }

  function renderList(listEl, emptyEl, items, type) {
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = "";
    if (!items.length) {
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";

    for (const quest of items) {
      const li = document.createElement("li");
      li.className = "qt-item";
      li.dataset.id = quest.id;

      const header = document.createElement("div");
      header.className = "qt-item-header";

      const title = document.createElement("div");
      title.className = "qt-item-title";
      title.textContent = quest.title;

      const meta = document.createElement("div");
      meta.className = "qt-item-meta";

      const metaParts = [];

      if (quest.questGiver) {
        metaParts.push(`From: ${quest.questGiver}`);
      }

      if (quest.reward) {
        metaParts.push(`Reward: ${quest.reward}`);
      }

      const created = new Date(quest.createdAt || Date.now());
      const dateParts = [`Added: ${formatShortDate(created)}`];

      if (type === "completed" && quest.completedAt) {
        const done = new Date(quest.completedAt);
        dateParts.push(`Completed: ${formatShortDate(done)}`);
      }

      metaParts.push(...dateParts);

      meta.textContent = metaParts.join(" · ");

      header.append(title, meta);

      const desc = document.createElement("div");
      desc.className = "qt-item-desc";
      desc.textContent = quest.description || "";

      const actions = document.createElement("div");
      actions.className = "qt-item-actions";

      if (type === "active") {
        const completeBtn = document.createElement("button");
        completeBtn.type = "button";
        completeBtn.className = "qt-btn-ghost";
        completeBtn.textContent = "Complete";
        completeBtn.dataset.action = "complete";
        actions.appendChild(completeBtn);
      } else if (type === "completed") {
        const reopenBtn = document.createElement("button");
        reopenBtn.type = "button";
        reopenBtn.className = "qt-btn-ghost";
        reopenBtn.textContent = "Reopen";
        reopenBtn.dataset.action = "reopen";

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "qt-btn-danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.dataset.action = "delete";

        actions.append(reopenBtn, deleteBtn);
      }

      li.append(header);
      if (quest.description) li.append(desc);
      if (actions.childElementCount) li.append(actions);

      listEl.appendChild(li);
    }
  }

  // --- DRAG ---

  function setupDragging(host, els, persistState) {
    if (!els.dragHandle) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const onMouseDown = (event) => {
      dragging = true;
      const rect = host.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      event.preventDefault();
    };

    const onMouseMove = (event) => {
      if (!dragging) return;
      host.style.left = `${event.clientX - offsetX}px`;
      host.style.top = `${event.clientY - offsetY}px`;
    };

    const onMouseUp = async () => {
      if (!dragging) return;
      dragging = false;
      await persistState();
    };

    els.dragHandle.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // --- ZAKŁADKI ---

  function setupTabs(els) {
    const buttons = els.tabButtons;
    const panels = els.tabPanels;
    if (!buttons || !panels || !buttons.length || !panels.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.qtTab;
        if (!target) return;

        buttons.forEach((b) =>
          b.classList.toggle("qt-tab-active", b === btn)
        );
        panels.forEach((panel) => {
          const panelKey = panel.dataset.qtPanel;
          panel.classList.toggle(
            "qt-tab-content-active",
            panelKey === target
          );
        });
      });
    });
  }

  // --- FORMULARZ DODAWANIA ---

  function setupForm(els, quests, persistState, renderAll) {
    if (!els.addForm || !els.titleInput) return;

    els.addForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const title = els.titleInput.value.trim();
      const questGiver = (els.giverInput?.value || "").trim();
      const reward = (els.rewardInput?.value || "").trim();
      const description = (els.descriptionInput?.value || "").trim();

      if (!title) return;

      const quest = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        questGiver,
        reward,
        description,
        createdAt: Date.now()
      };

      quests.active.push(quest);

      els.titleInput.value = "";
      if (els.giverInput) els.giverInput.value = "";
      if (els.rewardInput) els.rewardInput.value = "";
      if (els.descriptionInput) els.descriptionInput.value = "";

      renderAll();
      await persistState();
    });
  }

  // --- AKTYWNE QUESTY ---

  function setupActiveListActions(els, quests, persistState, renderAll) {
    if (!els.activeList) return;

    els.activeList.addEventListener("click", async (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const item = btn.closest(".qt-item");
      if (!item) return;

      const id = item.dataset.id;
      if (!id) return;

      if (action === "complete") {
        const index = quests.active.findIndex((q) => q.id === id);
        if (index === -1) return;
        const [quest] = quests.active.splice(index, 1);
        quest.completedAt = Date.now();
        quests.completed.unshift(quest);
      }

      renderAll();
      await persistState();
    });
  }

  // --- ZAKOŃCZONE QUESTY ---

  function setupCompletedListActions(els, quests, persistState, renderAll) {
    if (!els.completedList) return;

    els.completedList.addEventListener("click", async (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const item = btn.closest(".qt-item");
      if (!item) return;

      const id = item.dataset.id;
      if (!id) return;

      if (action === "reopen") {
        const index = quests.completed.findIndex((q) => q.id === id);
        if (index === -1) return;
        const [quest] = quests.completed.splice(index, 1);
        quest.completedAt = undefined;
        quests.active.unshift(quest);
      } else if (action === "delete") {
        const index = quests.completed.findIndex((q) => q.id === id);
        if (index === -1) return;
        quests.completed.splice(index, 1);
      }

      renderAll();
      await persistState();
    });
  }

  // --- POKAŻ/UKRYJ OKNO ---

  function setupCloseToggle(els, persistState) {
    if (!els.closeBtn || !els.wrap) return;

    els.closeBtn.addEventListener("click", async () => {
      const currentlyVisible = els.wrap.style.display !== "none";
      const nowHidden = currentlyVisible;

      els.wrap.style.display = nowHidden ? "none" : "block";
      await persistState({ questTrackerHidden: nowHidden });
    });
  }

    // --- Quest tracker visibility updates from background ---
  if (typeof browser !== "undefined" && browser.runtime && browser.runtime.onMessage) {
    browser.runtime.onMessage.addListener((message, sender) => {
      if (!message || message.type !== "questHiddenUpdated") return;

      const overlay = window.TFExt;
      if (!overlay || !overlay.questElements || !overlay.questElements.wrap) return;

      const hidden = !!message.hidden;
      overlay.questElements.wrap.style.display = hidden ? "none" : "block";
    });
  }

  // start
  tryInit(0);
})();
