"use strict";

(function initQuestTrackerUI() {
  const overlay = window.TFExt;
  if (!overlay || typeof overlay.shouldRun !== "function" || !overlay.shouldRun()) return;

  // Jeśli z jakiegoś powodu host już jest – usuwamy i tworzymy od nowa
  const existing = document.getElementById("quest-tracker-host");
  if (existing) existing.remove();

  const host = createHost();
  const shadow = host.attachShadow({ mode: "open" });

  overlay.questHost = host;
  overlay.questShadow = shadow;
  overlay.questElements = overlay.questElements || {};

  injectStyles(shadow);
  injectTemplate(shadow, overlay.questElements);

  function createHost() {
    const element = document.createElement("div");
    element.id = "quest-tracker-host";
    Object.assign(element.style, {
      position: "fixed",
      zIndex: "2147483646", // trochę poniżej głównego okna, ale nadal "on top"
      top: "120px",
      left: "340px"
    });
    document.documentElement.appendChild(element);
    return element;
  }

  function injectStyles(shadowRoot) {
    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; font-family: system-ui, sans-serif; }

      .qt-widget {
        position: relative;
        min-width: 260px;
        max-width: 380px;
        background: rgba(30,30,30,.95);
        color: #fff;
        border: 1px solid rgba(255,255,255,.2);
        border-radius: 10px;
        box-shadow: 0 6px 14px rgba(0,0,0,.35);
        font-size: 13px;
      }

      .qt-header {
        cursor: move;
        padding: 8px 12px;
        font-weight: 600;
        border-bottom: 1px solid rgba(255,255,255,.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        user-select: none;
      }

      .qt-title {
        font-size: 13px;
      }

      .qt-close-btn {
        border: none;
        background: transparent;
        color: rgba(255,255,255,.7);
        font-size: 14px;
        cursor: pointer;
        padding: 0 4px;
        border-radius: 4px;
      }
      .qt-close-btn:hover {
        background: rgba(255,255,255,.15);
        color: #fff;
      }

      .qt-tabs {
        display: flex;
        gap: 4px;
        padding: 4px 8px 0;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .qt-tab-btn {
        flex: 1;
        padding: 4px 6px;
        font-size: 12px;
        border-radius: 6px 6px 0 0;
        border: 1px solid transparent;
        border-bottom: none;
        background: transparent;
        color: rgba(255,255,255,.75);
        cursor: pointer;
      }

      .qt-tab-btn.qt-tab-active {
        border-color: rgba(255,255,255,.25);
        border-bottom-color: rgba(30,30,30,.95);
        background: rgba(255,255,255,.06);
        color: #fff;
      }

      .qt-body {
        padding: 6px 8px 8px;
      }

      .qt-tab-content {
        display: none;
      }

      .qt-tab-content.qt-tab-content-active {
        display: block;
      }

      .qt-add-form {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .qt-field {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .qt-field span {
        font-size: 11px;
        opacity: .85;
      }

      .qt-field input,
      .qt-field textarea {
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.25);
        background: rgba(0,0,0,.45);
        color: #fff;
        font-size: 12px;
        padding: 4px 6px;
        resize: vertical;
      }

      .qt-field input:focus,
      .qt-field textarea:focus {
        outline: none;
        border-color: rgba(255,255,255,.6);
      }

      .qt-actions-row {
        display: flex;
        justify-content: flex-end;
        margin-top: 4px;
      }

      .qt-primary-btn {
        border-radius: 6px;
        border: 1px solid rgba(0,200,140,.8);
        background: rgba(0,200,140,.15);
        color: #b5ffdf;
        font-size: 12px;
        padding: 4px 10px;
        cursor: pointer;
      }
      .qt-primary-btn:hover {
        background: rgba(0,200,140,.3);
      }

      .qt-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 260px;
        overflow-y: auto;
      }

      .qt-empty {
        font-size: 11px;
        opacity: .8;
        margin-bottom: 4px;
      }

      .qt-item {
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(0,0,0,.45);
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .qt-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
      }

      .qt-item-title {
        font-weight: 600;
        font-size: 12px;
      }

      .qt-item-meta {
        font-size: 10px;
        opacity: .7;
      }

      .qt-item-desc {
        font-size: 11px;
        opacity: .9;
        white-space: pre-wrap;
        word-break: break-word;
        margin-top: 2px;
      }

      .qt-item-actions {
        display: flex;
        justify-content: flex-end;
        gap: 4px;
        margin-top: 4px;
      }

      .qt-btn-ghost,
      .qt-btn-danger {
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.25);
        background: rgba(255,255,255,.06);
        color: #fff;
        font-size: 11px;
        padding: 2px 8px;
        cursor: pointer;
      }

      .qt-btn-danger {
        border-color: rgba(255,80,80,.8);
        color: #ffd6d6;
        background: rgba(255,80,80,.08);
      }

      .qt-btn-ghost:hover {
        background: rgba(255,255,255,.16);
      }
      .qt-btn-danger:hover {
        background: rgba(255,80,80,.2);
      }
    `;
    shadowRoot.appendChild(style);
  }

  function injectTemplate(shadowRoot, elements) {
    const container = document.createElement("div");
    container.className = "qt-widget";
    container.innerHTML = `
      <div class="qt-header" id="qt-drag-handle">
        <div class="qt-title">Quest Tracker</div>
      </div>

      <div class="qt-tabs">
        <button class="qt-tab-btn qt-tab-active" data-qt-tab="add">Add Quest</button>
        <button class="qt-tab-btn" data-qt-tab="active">Active Quests</button>
        <button class="qt-tab-btn" data-qt-tab="completed">Completed Quests</button>
      </div>

      <div class="qt-body">
        <div class="qt-tab-content qt-tab-content-active" data-qt-panel="add">
          <form id="qt-add-form" class="qt-add-form">
            <div class="qt-field">
              <span>Quest Name</span>
              <input id="qt-title" type="text" maxlength="120" required />
            </div>

            <div class="qt-field">
              <span>Quest Giver (optional)</span>
              <input id="qt-giver" type="text" maxlength="120" />
            </div>

            <div class="qt-field">
              <span>Reward (optional)</span>
              <input id="qt-reward" type="text" maxlength="160" />
            </div>

            <div class="qt-field">
              <span>Description (optional)</span>
              <textarea id="qt-description" rows="3" maxlength="600"></textarea>
            </div>

            <div class="qt-actions-row">
              <button type="submit" class="qt-primary-btn">Add quest</button>
            </div>
          </form>
        </div>


        <div class="qt-tab-content" data-qt-panel="active">
          <div class="qt-empty" id="qt-empty-active">No active quests.</div>
          <ul class="qt-list" id="qt-active-list"></ul>
        </div>

        <div class="qt-tab-content" data-qt-panel="completed">
          <div class="qt-empty" id="qt-empty-completed">No completed quests.</div>
          <ul class="qt-list" id="qt-completed-list"></ul>
        </div>
      </div>
    `;

    shadowRoot.appendChild(container);

    // referencje do elementów w overlay.questElements
    elements.wrap = container;
    elements.dragHandle = shadowRoot.getElementById("qt-drag-handle");
    elements.tabButtons = shadowRoot.querySelectorAll(".qt-tab-btn");
    elements.tabPanels = shadowRoot.querySelectorAll(".qt-tab-content");

    elements.addForm = shadowRoot.getElementById("qt-add-form");
    elements.titleInput = shadowRoot.getElementById("qt-title");
    elements.giverInput = shadowRoot.getElementById("qt-giver");
    elements.rewardInput = shadowRoot.getElementById("qt-reward");
    elements.descriptionInput = shadowRoot.getElementById("qt-description");

    elements.activeList = shadowRoot.getElementById("qt-active-list");
    elements.completedList = shadowRoot.getElementById("qt-completed-list");
    elements.emptyActive = shadowRoot.getElementById("qt-empty-active");
    elements.emptyCompleted = shadowRoot.getElementById("qt-empty-completed");
  }
})();
