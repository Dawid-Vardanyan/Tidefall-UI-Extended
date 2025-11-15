"use strict";

(function initSharedNamespace() {
  const GLOBAL_KEY = "TFExt";
  const existingNamespace = window[GLOBAL_KEY] || {};
  if (existingNamespace.__initialized) {
    window[GLOBAL_KEY] = existingNamespace;
    return;
  }

  const defaultState = Object.freeze({
    counts: { gold: 0, silver: 0, copper: 0 },
    position: { top: 20, left: 20 },
    hidden: false,
    inventory: [],
    charactersUnlocked: {},
    quests: {
      active: [],
      completed: []
    }
  });

  const namespace = Object.assign(existingNamespace, {
    state: null,
    host: null,
    shadow: null,
    elements: existingNamespace.elements || {},
    dragging: false,
    dragOffset: existingNamespace.dragOffset || { x: 0, y: 0 }
  });

  function shouldRun() {
    if (window.top !== window) return false;
    if (location.protocol === "about:" || location.protocol === "moz-extension:") return false;
    if (location.host === "addons.mozilla.org") return false;
    return true;
  }

  async function getState() {
    return browser.storage.local.get(defaultState);
  }

  async function setState(partial) {
    const current = await browser.storage.local.get();
    return browser.storage.local.set({
      ...defaultState,
      ...current,
      ...partial
    });
  }

  let cachedCharacters = null;

  async function loadCharacters() {
    if (cachedCharacters) return cachedCharacters;

    try {
      const url = browser.runtime.getURL("characters.json");
      const response = await fetch(url);
      const data = await response.json();
      cachedCharacters = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to load characters.json", error);
      cachedCharacters = [];
    }

    return cachedCharacters;
  }

  function normalizeCoins(counts) {
    const normalized = {
      gold: counts.gold || 0,
      silver: counts.silver || 0,
      copper: counts.copper || 0
    };

    while (normalized.copper >= 10) {
      normalized.copper -= 10;
      normalized.silver += 1;
    }

    while (normalized.silver >= 10) {
      normalized.silver -= 10;
      normalized.gold += 1;
    }

    while (normalized.copper < 0 && (normalized.silver > 0 || normalized.gold > 0)) {
      if (normalized.silver > 0) {
        normalized.silver -= 1;
        normalized.copper += 10;
      } else if (normalized.gold > 0) {
        normalized.gold -= 1;
        normalized.silver += 9;
        normalized.copper += 10;
      }
    }

    while (normalized.silver < 0 && normalized.gold > 0) {
      normalized.gold -= 1;
      normalized.silver += 10;
    }

    normalized.gold = Math.max(0, normalized.gold);
    normalized.silver = Math.max(0, normalized.silver);
    normalized.copper = Math.max(0, normalized.copper);

    Object.assign(counts, normalized);
    return counts;
  }

  function createUnhideButton() {
    const { shadow, elements } = namespace;
    if (!shadow || shadow.querySelector(".unhide")) return;

    const button = document.createElement("button");
    button.className = "unhide";
    button.textContent = "Show Coin Counter";
    button.addEventListener("click", async () => {
      if (elements.wrap) elements.wrap.style.display = "";
      button.remove();
      await setState({ hidden: false });
    });

    shadow.appendChild(button);
  }

  Object.assign(namespace, {
    __initialized: true,
    defaultState,
    shouldRun,
    getState,
    setState,
    normalizeCoins,
    loadCharacters,
    createUnhideButton
  });

  window[GLOBAL_KEY] = namespace;
})();
