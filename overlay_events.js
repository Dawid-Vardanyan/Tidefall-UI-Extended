"use strict";

(async function initOverlayEvents() {
  const overlay = window.TFExt;
  if (!overlay || !overlay.shouldRun || !overlay.shouldRun() || !overlay.shadow) return;

  const shadow = overlay.shadow;
  const host = overlay.host;
  const els = overlay.elements || {};

  const COIN_KEYS = ["gold", "silver", "copper"];
  const TOGGLE_KEYS = new Set(["c", "C"]);

  const state = await overlay.getState();
  overlay.state = state;

  const charactersUnlocked = state.charactersUnlocked || {};
  const allCharacters = await overlay.loadCharacters();
  let currentQuery = "";

  positionHost(state.position);
  updateCoinDisplay(state.counts || overlay.defaultState.counts);

  const inventoryUI = createInventoryUI(els.inventoryList);
  inventoryUI.render(state.inventory || []);

  const unlockedCharactersUI = createCharacterUI(els.charactersListUnlocked);
  const lockedCharactersUI = createCharacterUI(els.charactersListLocked);

  const characterUI = {
    render(characters, unlockedMap) {
      const safeCharacters = Array.isArray(characters) ? characters : [];
      const unlockedList = [];
      const lockedList = [];

      for (const character of safeCharacters) {
        const isUnlocked = !!(unlockedMap && unlockedMap[character.id]);
        if (isUnlocked) {
          unlockedList.push(character);
        } else {
          lockedList.push(character);
        }
      }

      if (unlockedCharactersUI) {
        unlockedCharactersUI.render(unlockedList, unlockedMap);
      }
      if (lockedCharactersUI) {
        lockedCharactersUI.render(lockedList, unlockedMap);
      }
    }
  };

  characterUI.render(allCharacters, charactersUnlocked);


  await initMapSystem();

  setupCharacterSearch();
  setupCharacterToggle();
  applyHiddenState(state.hidden);
  setupTabSwitching();
  setupCharacterSubTabs();
  setupClickDelegation();
  setupInventoryForm();
  setupFooterButtons();
  setupDragging();
  setupKeyboardToggle();
  setupRuntimeMessages();
  setupHiddenObserver();

  function positionHost(position = overlay.defaultState.position) {
    if (!host) return;
    host.style.top = `${position.top ?? overlay.defaultState.position.top}px`;
    host.style.left = `${position.left ?? overlay.defaultState.position.left}px`;
  }

  function updateCoinDisplay(counts = overlay.defaultState.counts) {
    for (const key of COIN_KEYS) {
      const value = counts[key] ?? 0;
      const element = shadow.querySelector(`.row[data-key="${key}"] [data-role="count"]`);
      if (element) element.textContent = String(value);
    }
  }

  function createInventoryUI(listElement) {
    if (!listElement) {
      return { render: () => {} };
    }

    return {
      render(items) {
        listElement.innerHTML = "";
        if (!items || !items.length) return;
        for (const item of items) {
          listElement.appendChild(createInventoryItemElement(item));
        }
      }
    };
  }

  function createInventoryItemElement(item) {
    const container = document.createElement("div");
    container.className = "inv-item";
    container.dataset.id = item.id;

    const icon = document.createElement("div");
    icon.className = "inv-icon";
    icon.textContent = (item.icon || "❔").trim() || "❔";

    const main = document.createElement("div");
    main.className = "inv-main";

    const name = document.createElement("div");
    name.className = "inv-name";
    name.textContent = item.name || "Unnamed item";

    const descriptionText = (item.description || "").trim();
    if (descriptionText) {
      const desc = document.createElement("div");
      desc.className = "inv-desc";
      desc.textContent = descriptionText;
      main.append(name, desc);
    } else {
      main.append(name);
    }

    const qtyRow = document.createElement("div");
    qtyRow.className = "inv-qty-row";

    const qtyLabel = document.createElement("span");
    qtyLabel.className = "inv-qty-label";
    qtyLabel.textContent = "Qty:";

    const decButton = createInventoryAdjustButton("dec");
    const qtyValue = document.createElement("span");
    qtyValue.className = "inv-qty";
    qtyValue.textContent = `x${item.qty ?? 0}`;
    const incButton = createInventoryAdjustButton("inc");

    qtyRow.append(qtyLabel, decButton, qtyValue, incButton);
    main.append(qtyRow);

    const right = document.createElement("div");
    right.className = "inv-right";

    const deleteButton = document.createElement("button");
    deleteButton.className = "inv-del-btn";
    deleteButton.type = "button";
    deleteButton.title = "Delete item";
    deleteButton.textContent = "✕";

    right.append(deleteButton);

    container.append(icon, main, right);
    return container;
  }


  function createInventoryAdjustButton(action) {
    const button = document.createElement("button");
    button.className = "btn";
    button.dataset.type = "inv";
    button.dataset.action = action;
    button.type = "button";
    button.title = action === "inc" ? "Increase (Shift = +10)" : "Decrease (Shift = -10)";
    button.textContent = action === "inc" ? "+" : "−";
    return button;
  }

  function createCharacterUI(listElement) {
    if (!listElement) {
      return { render: () => {} };
    }

    return {
      render(characters, unlockedMap) {
        listElement.innerHTML = "";
        if (!characters || !characters.length) return;

        for (const character of characters) {
          listElement.appendChild(createCharacterRow(character, unlockedMap));
        }
      }
    };
  }

  function wrapCharacterShort(text, maxLen = 120) {
  if (!text) return "";

  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const prefix = line.length ? " " : "";
    const next = line + prefix + word;

    if (next.length > maxLen && line.length) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);

  // używamy <br>, bo white-space: normal zje same \n
  return lines.join("<br>");
  }


  function createCharacterRow(character, unlockedMap) {
    const unlocked = !!(unlockedMap && unlockedMap[character.id]);

    const container = document.createElement("div");
    container.className = "char-item";
    container.dataset.id = character.id;

    const label = document.createElement("label");
    label.className = "char-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "char-unlocked";
    checkbox.checked = unlocked;

    const text = document.createElement("div");
    text.className = "char-text";

    const name = document.createElement("div");
    name.className = "char-name";
    name.textContent = character.name || "Unknown";

    const location = document.createElement("div");
    location.className = "char-sub";
    location.textContent = unlocked ? character.location || "" : "";

    const summary = document.createElement("div");
      summary.className = "char-short";

      if (unlocked) {
        const shortText = character.short || "";
        summary.innerHTML = wrapCharacterShort(shortText, 120);
      } else {
        summary.textContent =
          "Information hidden until you mark this character as discovered.";
      }

    text.append(name, location, summary);
    label.append(checkbox, text);
    container.appendChild(label);
    return container;
  }

  function setupCharacterSearch() {
    if (!els.charSearch) return;

    els.charSearch.addEventListener("input", async () => {
      currentQuery = els.charSearch.value.toLowerCase().trim();
      const latestState = await overlay.getState();
      const unlocked = latestState.charactersUnlocked || {};
      const filtered = filterCharacters(allCharacters, currentQuery);
      characterUI.render(filtered, unlocked);
    });
  }

  function setupCharacterToggle() {
    const lists = [els.charactersListUnlocked, els.charactersListLocked].filter(Boolean);
    if (!lists.length) return;

    for (const listEl of lists) {
      listEl.addEventListener("change", async (event) => {
        const checkbox = event.target.closest(".char-unlocked");
        if (!checkbox) return;

        const item = event.target.closest(".char-item");
        if (!item) return;

        const id = item.dataset.id;
        const latestState = await overlay.getState();
        const unlocked = { ...(latestState.charactersUnlocked || {}) };
        unlocked[id] = checkbox.checked;

        await overlay.setState({ charactersUnlocked: unlocked });

        const filtered = filterCharacters(allCharacters, currentQuery);
        characterUI.render(filtered, unlocked);
      });
    }
  }


  function filterCharacters(characters, query) {
    if (!query) return characters;
    const lowerQuery = query.toLowerCase();
    return characters.filter((character) => {
      const haystack = `${character.name || ""} ${character.location || ""} ${character.short || ""}`.toLowerCase();
      return haystack.includes(lowerQuery);
    });
  }

  function initSpeakerAutoDetection({ allCharacters, charactersUnlocked, characterUI, overlay }) {
    if (!Array.isArray(allCharacters) || allCharacters.length === 0) return;

    // Upewniamy się, że mamy obiekt, a nie null / tablicę itd.
    if (!charactersUnlocked || typeof charactersUnlocked !== "object") {
      charactersUnlocked = {};
    }

    // mapa: pełna nazwa postaci -> jej ID z JSONa
    const nameToId = new Map();
    for (const ch of allCharacters) {
      if (!ch || !ch.id || !ch.name) continue;
      nameToId.set(ch.name.trim(), ch.id);
    }

    let lastProcessedId = null;

    async function unlockCharacterById(id) {
      if (!id) return;

      // jeśli już odblokowana – nic nie rób
      if (charactersUnlocked[id]) return;

      try {
        // bierzemy najświeższy stan z pamięci rozszerzenia
        const latestState = await overlay.getState();
        const current = latestState.charactersUnlocked || {};

        if (current[id]) return; // już jest true w storage

        const updated = { ...current, [id]: true };

        await overlay.setState({ charactersUnlocked: updated });

        // aktualizujemy lokalną kopię i UI
        charactersUnlocked = updated;
        characterUI.render(allCharacters, charactersUnlocked);
      } catch (e) {
        console.error("[Tidefall UI] Failed to persist charactersUnlocked", e);
      }
    }

  function handleSpeakerImage(img) {
    if (!img) return;

    const alt = (img.getAttribute("alt") || "").trim();
    if (!alt) return;

    const id = nameToId.get(alt);
    if (!id) {
      // np. alt nie zgadza się z name w characters.json
      console.debug("[Tidefall UI] Unknown speaker from alt:", alt);
      return;
    }

    // ten sam speaker co ostatnio – olewamy duplikat
    if (id === lastProcessedId) return;

    lastProcessedId = id;
    unlockCharacterById(id);
  }

  // Na starcie: jeśli już są jakieś portrety, bierzemy ostatni
  const existing = document.querySelectorAll("img.if-speaker-image");
  if (existing.length > 0) {
    const lastImg = existing[existing.length - 1];
    handleSpeakerImage(lastImg);
  }

  // Obserwujemy DOM – nowe wiadomości w czacie / nowi speakerzy
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;

        // bezpośrednio dodany <img class="if-speaker-image">
        if (node.matches && node.matches("img.if-speaker-image")) {
          handleSpeakerImage(node);
          return;
        }

        // albo gdzieś głębiej w nowym subdrzewie
        if (node.querySelectorAll) {
          const imgs = node.querySelectorAll("img.if-speaker-image");
          if (imgs.length) {
            handleSpeakerImage(imgs[imgs.length - 1]); // bierzemy najnowszy
          }
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}


initSpeakerAutoDetection({
    allCharacters,
    charactersUnlocked,
    characterUI,
    overlay
  });


  function applyHiddenState(hidden) {
    if (!els.wrap) return;
    els.wrap.style.display = hidden ? "none" : "";
    if (hidden) overlay.createUnhideButton();
    else removeUnhideButton();
  }

  async function setHiddenState(hidden) {
    applyHiddenState(hidden);
    await overlay.setState({ hidden });
  }

  function removeUnhideButton() {
    const existing = shadow.querySelector(".unhide");
    if (existing) existing.remove();
  }

    async function initMapSystem() {
    const mapButtons = shadow.querySelectorAll(".map-location");
    if (!mapButtons.length) return;

    const locationState = {
      current: "stormpoint",           // startowa lokacja gracza
      selected: null,
      discovered: new Set(["stormpoint"]) // na razie tylko Stormpoint odkryte
    };

    const currentNameEl = shadow.getElementById("current-location-name");
    const currentDescEl = shadow.getElementById("current-location-desc");
    const currentMajorTitleEl = shadow.getElementById("current-location-major-title");
    const currentMajorListEl = shadow.getElementById("current-location-major-list");

    const selectedNameEl = shadow.getElementById("selected-location-name");
    const selectedDescEl = shadow.getElementById("selected-location-desc");
    const selectedMajorTitleEl = shadow.getElementById("selected-location-major-title");
    const selectedMajorListEl = shadow.getElementById("selected-location-major-list");


    let locationLore = {};

    await loadLocationLore();

    async function loadLocationLore() {
      try {
        const url = browser.runtime.getURL("locations.json");
        const response = await fetch(url);
        const data = await response.json();
        locationLore = data || {};
      } catch (error) {
        console.error("Failed to load locations.json", error);
        locationLore = {};
      }
    }

    function getLocationInfo(key) {
      const info = locationLore[key] || {};
      return {
        description: info.description || "No detailed information for this location yet.",
        majorPlaces: Array.isArray(info.majorPlaces) ? info.majorPlaces : []
      };
    }

    function updatePanels() {
      const cur = locationState.current;
      if (cur) {
        const btn = shadow.querySelector(`.map-location[data-loc="${cur}"]`);
        const name = btn ? btn.getAttribute("data-name") : cur;
        const info = getLocationInfo(cur);

        currentNameEl.textContent = name;
        currentDescEl.textContent = info.description;

        if (info.majorPlaces.length) {
          currentMajorTitleEl.textContent = "Major Places";
          currentMajorListEl.innerHTML = info.majorPlaces
            .map(place => `<li>${place}</li>`)
            .join("");
        } else {
          currentMajorTitleEl.textContent = "";
          currentMajorListEl.innerHTML = "";
        }
      } else {
        currentNameEl.textContent = "–";
        currentDescEl.textContent = "You are nowhere in particular.";
        currentMajorTitleEl.textContent = "";
        currentMajorListEl.innerHTML = "";
      }

      const sel = locationState.selected;
      if (!sel) {
        selectedNameEl.textContent = "–";
        selectedDescEl.textContent = "Click a discovered location on the map.";
        selectedMajorTitleEl.textContent = "";
        selectedMajorListEl.innerHTML = "";
      } else {
        const btn = shadow.querySelector(`.map-location[data-loc="${sel}"]`);
        const name = btn ? btn.getAttribute("data-name") : sel;
        const isDiscovered = locationState.discovered.has(sel);

        selectedNameEl.textContent = name;

        if (!isDiscovered) {
          selectedDescEl.textContent = "You haven't visited this location yet.";
          selectedMajorTitleEl.textContent = "";
          selectedMajorListEl.innerHTML = "";
        } else {
          const info = getLocationInfo(sel);
          selectedDescEl.textContent = info.description;

          if (info.majorPlaces.length) {
            selectedMajorTitleEl.textContent = "Major Places";
            selectedMajorListEl.innerHTML = info.majorPlaces
              .map(place => `<li>${place}</li>`)
              .join("");
          } else {
            selectedMajorTitleEl.textContent = "";
            selectedMajorListEl.innerHTML = "";
          }
        }
      }
    }


    function refreshMapVisuals() {
      shadow.querySelectorAll(".map-location").forEach((btn) => {
        const key = btn.dataset.loc;
        const isDiscovered = locationState.discovered.has(key);
        const isCurrent = key === locationState.current;
        const isSelected = key === locationState.selected;

        btn.classList.remove("loc-undiscovered", "loc-discovered", "loc-current", "loc-selected");

        if (!isDiscovered) {
          btn.classList.add("loc-undiscovered");
        } else {
          btn.classList.add("loc-discovered");
        }

        if (isCurrent) {
          btn.classList.add("loc-current");
        } else if (isSelected && isDiscovered) {
          btn.classList.add("loc-selected");
        }
      });
    }

    function handleSelect(key) {
      locationState.selected = key;
      refreshMapVisuals();
      updatePanels();
    }

    function handleTravel(key) {
      // nie podróżujemy do nieodkrytej lokacji
      if (!locationState.discovered.has(key)) return;

      locationState.current = key;
      locationState.selected = key;
      locationState.discovered.add(key);

      refreshMapVisuals();
      updatePanels();
    }

    mapButtons.forEach((btn) => {
      const key = btn.dataset.loc;

      // LPM – zaznaczenie lokacji
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        handleSelect(key);
      });

      // ŚPM – podróż
      btn.addEventListener("auxclick", (event) => {
        if (event.button === 1) {
          event.preventDefault();
          event.stopPropagation();
          handleTravel(key);
        }
      });
    });

    const altToLocMap = {
      "Stormpoint": "stormpoint",
      "Village of Ebstone": "village-of-ebstone",
      "Outhaven": "outhaven",
      "Sarmuth": "sarmuth",
      "Gull": "gull",
      "Bogfield Farm": "bogfield-farm",
      "Strandford": "strandford",
      "Stony Holl": "stony-holl",
      "Vaultire Mine": "vaultire-mine",
      "Chaindeep Mine": "chaindeep-mine",
      "Bluestone Mine": "bluestone-mine",
      "Doggindale Mine": "doggindale-mine",
      "Blackstone Quarry": "blackstone-quarry",
      "Welkenbare Quarry": "welkenbare-quarry",
      "Aldspar Mine": "aldspar-mine",
      "Blackstone Fort": "blackstone-fort"
    };

    function normalizeLocationKeyFromAlt(alt) {
      if (!alt) return null;
      alt = alt.trim();
      if (altToLocMap[alt]) return altToLocMap[alt];

      // fallback: lowercase + spacje -> myślniki
      return alt.toLowerCase().replace(/\s+/g, "-");
    }

    function setupLocationAutoDetection() {
      let lastProcessedKey = null;

      function handleLocationImage(img) {
        const alt = img.getAttribute("alt");
        const key = normalizeLocationKeyFromAlt(alt);
        if (!key || key === lastProcessedKey) return;

        const btn = shadow.querySelector(`.map-location[data-loc="${key}"]`);
        if (!btn) {
          console.debug("[Map] Unknown location from alt:", alt, "→", key);
          lastProcessedKey = key;
          return;
        }

        lastProcessedKey = key;

        // Auto-odblokowanie / ustawienie pozycji gracza
        locationState.current = key;
        locationState.selected = key;
        locationState.discovered.add(key);

        refreshMapVisuals();
        updatePanels();
      }

      // Przy starcie – weź ostatni istniejący obrazek lokacji, jeśli jest
      const existing = document.querySelectorAll("img.if-location-image");
      if (existing.length > 0) {
        const lastImg = existing[existing.length - 1];
        handleLocationImage(lastImg);
      }

      // Obserwuj DOM – nowe wiadomości / zmiany w czacie
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;

            // bezpośrednio dodany img.if-location-image
            if (node.matches && node.matches("img.if-location-image")) {
              handleLocationImage(node);
              return;
            }

            // albo img.if-location-image gdzieś w środku nowego subdrzewa
            if (node.querySelectorAll) {
              const imgs = node.querySelectorAll("img.if-location-image");
              if (imgs.length) {
                handleLocationImage(imgs[imgs.length - 1]); // bierzemy NAJNOWSZY
              }
            }
          });
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    refreshMapVisuals();
    updatePanels();
    setupLocationAutoDetection();
  }

  function setupTabSwitching() {
    if (!els.tabBar) return;

    els.tabBar.addEventListener("click", (event) => {
      const button = event.target.closest(".tab-btn");
      if (!button) return;

      const tab = button.dataset.tab;
      shadow.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("tab-active"));
      button.classList.add("tab-active");

      shadow.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
      const active = shadow.getElementById(`tab-${tab}`);
      if (active) active.classList.add("active");
    });
  }

  function setupCharacterSubTabs() {
    const buttons = shadow.querySelectorAll(".char-tab-btn");
    const panels = shadow.querySelectorAll(".char-tab-panel");
    if (!buttons.length || !panels.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.charTab;
        if (!target) return;

        buttons.forEach((btn) => {
          btn.classList.toggle("char-tab-active", btn === button);
        });

        panels.forEach((panel) => {
          const isActive = panel.dataset.charPanel === target;
          panel.classList.toggle("active", isActive);
        });
      });
    });
  }


  function setupClickDelegation() {
    shadow.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const type = button.dataset.type;

      if (type === "coin") {
        await handleCoinButtonClick(button, event);
        return;
      }

      if (type === "inv" || button.classList.contains("inv-del-btn")) {
        await handleInventoryButtonClick(button, event);
      }
    });
  }

  async function handleCoinButtonClick(button, event) {
    const row = button.closest(".row");
    if (!row) return;

    const key = row.dataset.key;
    const increment = button.dataset.action === "inc";
    const step = (increment ? 1 : -1) * (event.shiftKey ? 10 : 1);

    const latestState = await overlay.getState();
    const counts = { ...(latestState.counts || {}) };
    counts[key] = (counts[key] || 0) + step;
    overlay.normalizeCoins(counts);

    await overlay.setState({ counts });
    updateCoinDisplay(counts);
  }

  async function handleInventoryButtonClick(button, event) {
    const itemElement = button.closest(".inv-item");
    if (!itemElement) return;

    const id = itemElement.dataset.id;
    const latestState = await overlay.getState();
    const inventory = [...(latestState.inventory || [])];
    const index = inventory.findIndex((entry) => entry.id === id);
    if (index === -1) return;

    if (button.classList.contains("inv-del-btn")) {
      inventory.splice(index, 1);
    } else {
      const increment = button.dataset.action === "inc";
      const step = (increment ? 1 : -1) * (event.shiftKey ? 10 : 1);
      const currentQty = inventory[index].qty || 0;
      const updatedQty = currentQty + step;
      if (updatedQty <= 0) {
        inventory.splice(index, 1);
      } else {
        inventory[index] = { ...inventory[index], qty: updatedQty };
      }
    }

    await overlay.setState({ inventory });
    inventoryUI.render(inventory);
  }

  function setupInventoryForm() {
    if (!els.invAdd) return;

    els.invAdd.addEventListener("click", async () => {
      const name = (els.invName?.value || "").trim();
      if (!name) return;

      const icon = (els.invIcon?.value || "📦").trim() || "📦";
      let qtyValue = parseInt(els.invQty?.value, 10);
      if (!Number.isFinite(qtyValue) || qtyValue < 1) qtyValue = 1;
      const description = (els.invDesc?.value || "").trim();

      const latestState = await overlay.getState();
      const inventory = [...(latestState.inventory || [])];
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      inventory.push({ id, icon, name, qty: qtyValue, description });

      await overlay.setState({ inventory });
      inventoryUI.render(inventory);

      if (els.invName) els.invName.value = "";
      if (els.invQty) els.invQty.value = "1";
      if (els.invDesc) els.invDesc.value = "";
    });
  }

  function setupFooterButtons() {
    if (els.resetBtn) {
      els.resetBtn.addEventListener("click", async () => {
        const counts = { gold: 0, silver: 0, copper: 0 };
        await overlay.setState({ counts });
        updateCoinDisplay(counts);
      });
    }

    if (els.hideBtn) {
      els.hideBtn.addEventListener("click", async () => {
        await setHiddenState(true);
      });
    }
  }

  function setupDragging() {
    if (!els.dragHandle) return;

    els.dragHandle.addEventListener("mousedown", (event) => {
      overlay.dragging = true;
      const rect = host.getBoundingClientRect();
      overlay.dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      event.preventDefault();
    });

    window.addEventListener("mousemove", handleDragMove, { passive: true });
    window.addEventListener("mouseup", handleDragEnd);
  }

  function handleDragMove(event) {
    if (!overlay.dragging) return;
    host.style.left = `${event.clientX - overlay.dragOffset.x}px`;
    host.style.top = `${event.clientY - overlay.dragOffset.y}px`;
  }

  async function handleDragEnd() {
    if (!overlay.dragging) return;
    overlay.dragging = false;

    const top = parseInt(host.style.top, 10) || overlay.defaultState.position.top;
    const left = parseInt(host.style.left, 10) || overlay.defaultState.position.left;
    await overlay.setState({ position: { top, left } });
  }

  function setupKeyboardToggle() {
    window.addEventListener("keydown", (event) => {
      if (event.altKey && event.shiftKey && TOGGLE_KEYS.has(event.key)) {
        toggleVisibility();
      }
    });
  }

  async function toggleVisibility() {
    const isVisible = els.wrap && els.wrap.style.display !== "none";
    await setHiddenState(isVisible);
  }

  function setupRuntimeMessages() {
    browser.runtime.onMessage.addListener(async (message) => {
      if (!message || typeof message !== "object") return;
      if (message.type === "toggle") return toggleVisibility();
      if (message.type === "setHidden") return setHiddenState(!!message.hidden);
    });
  }

  function setupHiddenObserver() {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes.hidden) return;
      applyHiddenState(changes.hidden.newValue);
    });
  }
})();
