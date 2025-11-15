"use strict";

(function initOverlayUI() {
  const overlay = window.TFExt;
  if (!overlay || typeof overlay.shouldRun !== "function" || !overlay.shouldRun()) return;

  removeExistingHost();

  const host = createHost();
  const shadow = host.attachShadow({ mode: "open" });

  overlay.host = host;
  overlay.shadow = shadow;
  overlay.elements = overlay.elements || {};

 const runtime = typeof browser !== "undefined"
    ? browser.runtime
    : (typeof chrome !== "undefined" ? chrome.runtime : null);

const mapImageUrl = overlay.mapImageUrl || 
    (runtime ? runtime.getURL("ebstone_map.png") : "ebstone_map.png");

overlay.mapImageUrl = mapImageUrl;


  injectStyles(shadow);
  const widget = createWidget();
  shadow.appendChild(widget);

  cacheElements(shadow, overlay.elements, widget);

  function removeExistingHost() {
    if (globalThis.__coinCounterInjected) {
      const previous = document.getElementById("coin-counter-host");
      if (previous) previous.remove();
    }

    globalThis.__coinCounterInjected = true;

    const existing = document.getElementById("coin-counter-host");
    if (existing) existing.remove();
  }

  function createHost() {
    const element = document.createElement("div");
    element.id = "coin-counter-host";
    Object.assign(element.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "20px",
      left: "20px"
    });

    document.documentElement.appendChild(element);
    return element;
  }

  function injectStyles(shadowRoot) {
    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; font-family: system-ui, sans-serif; }

      .widget {
        position: relative;
        min-width: 260px;
        background: rgba(30,30,30,.9);
        color: #fff;
        border: 1px solid rgba(255,255,255,.2);
        border-radius: 10px;
        box-shadow: 0 6px 14px rgba(0,0,0,.3);
      }

      .header {
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

      .title { display:flex; align-items:center; gap:8px; }

      .help {
        position: relative;
        cursor: help;
        width: 18px; height: 18px;
        display: grid; place-items: center;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.3);
        background: rgba(255,255,255,.08);
        font-weight: 700;
        font-size: 12px;
        flex-shrink: 0;
      }
      .help:hover { background: rgba(255,255,255,.15); }

      .tooltip, .tooltip-info {
        display: none;
        position: absolute;
        top: 24px;
        right: 0;
        min-width: 220px;
        max-width: 280px;
        padding: 10px 12px;
        background: #111;
        color: #fff;
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 8px;
        box-shadow: 0 8px 20px rgba(0,0,0,.45);
        font-size: 12px;
        line-height: 1.35;
        z-index: 10;
        white-space: normal;
      }
      .help:hover .tooltip,
      .inv-info:hover .tooltip-info { display: block; }

      .tab-bar {
        display: flex;
        gap: 4px;
        padding: 4px 8px 0;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }
      .tab-btn {
        flex: 1;
        padding: 4px 6px;
        font-size: 12px;
        border-radius: 6px 6px 0 0;
        border: 1px solid transparent;
        background: transparent;
        color: #ccc;
        cursor: pointer;
      }
      .tab-btn.tab-active {
        border-color: rgba(255,255,255,.25);
        border-bottom-color: rgba(30,30,30,.9);
        background: rgba(255,255,255,.06);
        color: #fff;
      }

      .body { padding: 4px 8px 8px; }
      .tab-content { display: none; }
      .tab-content.active { display: block; }

      /* CAŁY LAYOUT ZAKŁADKI MAPY */
      #tab-map {
        /* zakładka zachowuje się jak zwykły kontener */
      }

      .map-layout {
        display: flex;
        flex-direction: row;
        gap: 16px;
        align-items: flex-start;
      }

      /* Rozmiar i położenie całego okna mapy (mapa + panel info) */
      #tab-map .map-layout {
        width: 60%;          /* ← TU sterujesz wielkością całości (60% ekranu) */
        max-width: 1400px;   /* zabezpieczenie na ultrapanoramach */
        margin-left: 10%;      /* przyklejone do lewej */
        margin-right: 10%;  /* luz z prawej */
      }

      /* MAPA PO LEWEJ */
      .map-wrapper {
        position: relative;
        border-radius: 10px;
        z-index: 1;
        overflow: visible; /* nie ucinamy tooltipów */
        border: 1px solid rgba(255,255,255,.15);
        background: rgba(0,0,0,.4);
        margin-top: 6px;
        flex: 0 0 80%;   /* ~65% szerokości bloku map-layout przypada na mapę */
      }

      .map-image {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 10px;
      }

      /* PANEL INFO PO PRAWEJ */
      .map-info-panel {
          flex: 0 0 60%;   /* ← SZEROKOŚĆ PANELU */
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 6px;
          margin-left: 24px;
          color: #f5f5f5;
          font-size: 13px;
      }

      .map-info-section {
        background: rgba(0,0,0,0.55);
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.15);
        padding: 8px 10px;
      }

      .map-info-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        opacity: 0.8;
        margin-bottom: 4px;
      }

      .map-info-name {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .map-info-desc {
        font-size: 12px;
        line-height: 1.35;
        opacity: 0.9;
      }

      .map-info-subtitle {
        margin-top: 6px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        opacity: 0.85;
      }

      .map-info-list {
        margin: 2px 0 0;
        padding-left: 14px;
        list-style-type: disc;
        font-size: 11px;
        line-height: 1.35;
        opacity: 0.95;
      }

      .map-info-list li {
        margin-bottom: 1px;
      }

      /* PINEZKI */
      .map-location {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #ff3b3b;  /* domyślnie: nieodkryta */
        border: 2px solid #ffffff;

        display: flex;
        align-items: center;
        justify-content: center;

        font-size: 16px;
        color: white;
        cursor: pointer;
        padding: 0;

        transition: transform 0.1s, box-shadow 0.15s, background 0.15s;
        z-index: 10;
      }

      .map-location:hover {
        transform: translate(-50%, -50%) scale(1.25);
        box-shadow: 0 0 8px rgba(255, 50, 50, 0.75);
      }

      /* STANY KOLORÓW */
      .map-location.loc-undiscovered {
        background: #e74c3c; /* czerwony */
      }

      .map-location.loc-discovered {
        background: #27ae60; /* zielony */
      }

      .map-location.loc-current {
        background: #f1c40f !important; /* żółty */
        box-shadow: 0 0 10px rgba(241,196,15,0.9);
      }

      .map-location.loc-selected {
        background: #3498db !important; /* niebieski */
        box-shadow: 0 0 10px rgba(52,152,219,0.9);
      }

      /* TOOLTIP (ładny, RPG) */
      .map-location::after {
        content: attr(data-name);
        position: absolute;
        top: -32px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(15,15,20,0.95), rgba(40,40,50,0.95));
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        color: #f8f8f8;
        border: 1px solid rgba(255,255,255,0.25);
        box-shadow: 0 2px 6px rgba(0,0,0,0.7);

        opacity: 0;
        pointer-events: none;
        transition: opacity .15s ease-out, transform .15s ease-out;
        z-index: 9999;
      }

      .map-location::before {
        content: "";
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 6px 6px 0 6px;
        border-style: solid;
        border-color: rgba(25,25,35,0.95) transparent transparent transparent;
        opacity: 0;
        transition: opacity .15s ease-out;
        pointer-events: none;
        z-index: 9998;
      }

      .map-location:hover::after {
        opacity: 1;
        transform: translateX(-50%) translateY(-2px);
      }

      .map-location:hover::before {
        opacity: 1;
      }


      /* COINS */
      .rows { padding-top: 4px; display: grid; gap: 8px; }
      .row {
        display: grid;
        grid-template-columns: 30px 1fr auto;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        background: rgba(255,255,255,.05);
        border-radius: 8px;
      }
      .emoji { font-size: 20px; text-align: center; }
      .name { font-size: 13px; opacity: .9; }
      .controls { display: inline-flex; align-items: center; gap: 6px; }
      .btn {
        width: 26px; height: 26px;
        display: grid; place-items: center;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.2);
        background: rgba(255,255,255,.05);
        cursor: pointer;
        user-select: none;
      }
      .btn:hover { background: rgba(255,255,255,.15); }
      .count { width: 40px; text-align: center; font-variant-numeric: tabular-nums; }

      /* INVENTORY */
      .inventory-form {
        display: grid;
        grid-template-columns: 90px 1fr 60px;
        grid-template-rows: auto auto;
        gap: 4px;
        margin-top: 6px;
        margin-bottom: 8px;
      }
      .inventory-form input,
      .inventory-form textarea,
      .inventory-form select {
        width: 100%;
        padding: 4px 6px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.25);
        background: rgba(0,0,0,.35);
        color: #fff;
        font-size: 12px;
        resize: none;
      }
      .inventory-form input::placeholder,
      .inventory-form textarea::placeholder { color: rgba(255,255,255,.4); }

      .inv-icon-select { font-size: 12px; }
      .inv-qty-input { width: 100%; text-align: center; }

      .inv-add-btn {
        grid-column: 3 / 4;
        grid-row: 1 / 3;
        padding: 4px 6px;
        border-radius: 8px;
        border: 1px solid rgba(120,220,180,.9);
        background: rgba(56,160,120,.95);
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
      }
      .inv-add-btn:hover { filter: brightness(1.05); }

      .inventory-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 220px;
        overflow: auto;
        padding-right: 2px;
      }

      .inv-item {
        display: grid;
        grid-template-columns: 30px 1fr auto;
        gap: 6px;
        align-items: stretch;
        padding: 6px 8px;
        background: rgba(255,255,255,.05);
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,.06);
      }

      .inv-icon {
        font-size: 18px;
        text-align: center;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 2px;
      }

      .inv-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .inv-name {
        font-size: 13px;
        font-weight: 500;
      }

      .inv-desc {
        font-size: 11px;
        opacity: .85;
        line-height: 1.3;
        color: rgba(255,255,255,.85);
        word-wrap: break-word;
        white-space: pre-wrap;
        max-width: 160ch;
      }

      .inv-qty-row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
      }

      .inv-qty-label {
        font-size: 11px;
        opacity: .8;
      }

      .inv-qty {
        min-width: 32px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }

      .inv-right {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-end;
        gap: 4px;
      }

      .inv-del-btn {
        width: 22px;
        height: 22px;
        font-size: 12px;
        border-radius: 6px;
        border: 1px solid rgba(255,100,100,.7);
        background: rgba(180,40,40,.9);
        color: #fff;
        cursor: pointer;
        user-select: none;
      }
      .inv-del-btn:hover { filter: brightness(1.1); }


      /* FOOTER */
      .footer {
        padding: 8px;
        display: flex;
        gap: 8px;
        border-top: 1px solid rgba(255,255,255,.1);
      }
      .tiny {
        flex: 1;
        font-size: 12px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.2);
        background: rgba(255,255,255,.05);
        color: #fff;
        cursor: pointer;
        padding: 6px 8px;
        user-select: none;
      }

      .unhide {
        position: fixed;
        bottom: 16px;
        left: 16px;
        z-index: 2147483647;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(0,0,0,.2);
        background: rgba(255,255,255,.9);
        cursor: pointer;
        font-size: 12px;
        color: #111;
      }

      .char-warning {
        margin: 6px 0;
        padding: 6px 8px;
        font-size: 11px;
        line-height: 1.3;
        border-radius: 6px;
        background: rgba(255,200,80,.12);
        border: 1px solid rgba(255,200,80,.35);
        color: #ffdba0;
      }

      .char-tabs {
        display: flex;
        gap: 4px;
        margin: 6px 0;
      }

      .char-tab-btn {
        flex: 1;
        padding: 4px 6px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.25);
        background: rgba(0,0,0,.35);
        color: #fff;
        font-size: 11px;
        cursor: pointer;
      }

      .char-tab-btn.char-tab-active {
        background: rgba(255,255,255,.12);
        border-color: rgba(255,255,255,.65);
      }

      .char-tab-panel {
        display: none;
      }

      .char-tab-panel.active {
        display: block;
      }

      .char-search {
        width: 100%;
        margin-bottom: 6px;
        padding: 4px 6px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.25);
        background: rgba(0,0,0,.35);
        color: #fff;
        font-size: 12px;
      }
      .char-search::placeholder { color: rgba(255,255,255,.4); }

      .characters-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 220px;
        overflow: auto;
        padding-right: 2px;
      }

      .char-item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px;
        align-items: center;
        padding: 4px 6px;
        background: rgba(255,255,255,.05);
        border-radius: 8px;
        font-size: 12px;
        box-sizing: border-box;
      }

      .char-main {
        display: flex;
        align-items: flex-start;
        gap: 6px;
      }
      .char-main input[type="checkbox"] { margin-top: 2px; }

      .char-text { display: flex; flex-direction: column; gap: 2px; }
      .char-name { font-size: 13px; }
      .char-sub { font-size: 11px; opacity: .8; }
      .char-short {
        font-size: 11px;
        opacity: .9;
        white-space: normal;
        overflow-wrap: break-word;
        word-break: break-word;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 4;
        overflow: hidden;
      }
    `;

    shadowRoot.appendChild(style);
  }

  function createWidget() {
    const container = document.createElement("div");
    container.className = "widget";
    container.innerHTML = `
      <div class="header" id="drag-handle">
        <div class="title">Tidefall UI Extended</div>
        <div class="help" aria-label="Help">
          ?
          <div class="tooltip" role="tooltip">
            <strong>Tidefall UI Extended</strong><br/>
            Draggable overlay to track money, characters, map, inventory and more!.<br/><br/>
            <strong>Coins:</strong><br/>
            • 10 Copper = 1 Silver, 10 Silver = 1 Gold.<br/>
            • <em>Shift + click</em> on “+”/“–” → change by <strong>±10</strong>.<br/><br/>
            <strong>Inventory:</strong><br/>
            • Add items with an emoji icon, name, quantity and optional description.<br/>
            • Hover the small “i” icon to see the item description.<br/><br/>
            <strong>Characters:</strong><br/>
            • Automatically detects characters you meet and unlocks them, showing some basic info.<br/>
            • You can unlock characters manually in "Locked" tab, if you think something went wrong.<br/><br/>
            <strong>Map:</strong><br/>
            • Get information about locations, what you can find in them, and track your current location.<br/>
            • Current location is detected automatically. You can force location change with MMB.<br/>
            • Location change works only if location is unlocked. You can't force location unlock.<br/><br/>
            <strong>Global:</strong><br/>
            • <em>Alt + Shift + C</em> toggles the main window.<br/>
            • Additional settings available from the toolbar popup.
          </div>
        </div>
      </div>

      <div class="tab-bar">
        <button class="tab-btn tab-active" data-tab="coins">Coins</button>
        <button class="tab-btn" data-tab="inventory">Inventory</button>
        <button class="tab-btn" data-tab="characters">Characters</button>
        <button class="tab-btn" data-tab="map">Map</button>
      </div>

      <div class="body">
        <div class="tab-content active" id="tab-coins">
          <div class="rows">
            <div class="row" data-key="gold">
              <div class="emoji">🟡</div>
              <div class="name">Gold</div>
              <div class="controls">
                <button class="btn" data-type="coin" data-action="dec" title="Decrease (Shift = -10)">−</button>
                <span class="count" data-role="count">0</span>
                <button class="btn" data-type="coin" data-action="inc" title="Increase (Shift = +10)">+</button>
              </div>
            </div>
            <div class="row" data-key="silver">
              <div class="emoji">⚪</div>
              <div class="name">Silver</div>
              <div class="controls">
                <button class="btn" data-type="coin" data-action="dec" title="Decrease (Shift = -10)">−</button>
                <span class="count" data-role="count">0</span>
                <button class="btn" data-type="coin" data-action="inc" title="Increase (Shift = +10)">+</button>
              </div>
            </div>
            <div class="row" data-key="copper">
              <div class="emoji">🟤</div>
              <div class="name">Copper</div>
              <div class="controls">
                <button class="btn" data-type="coin" data-action="dec" title="Decrease (Shift = -10)">−</button>
                <span class="count" data-role="count">0</span>
                <button class="btn" data-type="coin" data-action="inc" title="Increase (Shift = +10)">+</button>
              </div>
            </div>
          </div>
        </div>

        <div class="tab-content" id="tab-inventory">
          <div class="inventory-form">
            <select id="inv-icon" class="inv-icon-select">
              <option value="📦" selected>📦 Misc item</option>
              <option value="🧪">🧪 Potion</option>
              <option value="⚔️">⚔️ Weapon</option>
              <option value="🛡️">🛡️ Armor</option>
            </select>
            <input id="inv-name" placeholder="Item name" />
            <input id="inv-qty" class="inv-qty-input" type="number" min="1" value="1" />
            <textarea id="inv-desc" rows="2" placeholder="Description (optional)"></textarea>
            <button id="inv-add" class="inv-add-btn">Add item</button>
          </div>
          <div class="inventory-list" id="inventory-list"></div>
        </div>

        <div class="tab-content" id="tab-characters">
          <div class="char-warning">
            <strong>Warning:</strong> To avoid story spoilers, only mark characters as discovered after you have actually met and spoken to them in the game.
          </div>

          <!-- wspólny search dla obu list -->
          <input
            id="char-search"
            class="char-search"
            type="text"
            placeholder="Search characters..."
          />

          <div class="char-tabs">
            <button class="char-tab-btn char-tab-active" data-char-tab="unlocked">
              Unlocked
            </button>
            <button class="char-tab-btn" data-char-tab="locked">
              Locked
            </button>
          </div>

          <div class="char-tab-panel active" data-char-panel="unlocked">
            <div class="characters-list" id="characters-list-unlocked"></div>
          </div>

          <div class="char-tab-panel" data-char-panel="locked">
            <div class="characters-list" id="characters-list-locked"></div>
          </div>
        </div>


        <div class="tab-content" id="tab-map">
          <div class="map-layout">
            <!-- LEWA STRONA: MAPA -->
            <div class="map-wrapper" id="map-wrapper">
              <img src="${mapImageUrl}" alt="Ebstone map" class="map-image" />

              <!-- Główne miasta -->
              <button class="map-location" data-loc="village-of-ebstone" data-name="Village of Ebstone" style="top: 43%; left: 67%;">📍</button>
              <button class="map-location" data-loc="outhaven" data-name="Outhaven" style="top: 66%; left: 20.5%;">📍</button>
              <button class="map-location" data-loc="sarmuth" data-name="Sarmuth" style="top: 29%; left: 29%;">📍</button>
              <button class="map-location" data-loc="gull" data-name="Gull" style="top: 43%; left: 17.5%;">📍</button>
              <button class="map-location" data-loc="stormpoint" data-name="Stormpoint" style="top: 89%; left: 15%;">📍</button>

              <!-- Mniejsze lokacje -->
              <button class="map-location" data-loc="bogfield-farm" data-name="Bogfield Farm" style="top: 51%; left: 78%;">📍</button>
              <button class="map-location" data-loc="strandford" data-name="Strandford" style="top: 29%; left: 67%;">📍</button>
              <button class="map-location" data-loc="stony-holl" data-name="Stony Holl" style="top: 33%; left: 60%;">📍</button>

              <!-- Kopalnie -->
              <button class="map-location" data-loc="vaultire-mine" data-name="Vaultire Mine" style="top: 36%; left: 38%;">📍</button>
              <button class="map-location" data-loc="chaindeep-mine" data-name="Chaindeep Mine" style="top: 64%; left: 49.5%;">📍</button>
              <button class="map-location" data-loc="bluestone-mine" data-name="Bluestone Mine" style="top: 62%; left: 57%;">📍</button>
              <button class="map-location" data-loc="doggindale-mine" data-name="Doggindale Mine" style="top: 69%; left: 40.5%;">📍</button>
              <button class="map-location" data-loc="blackstone-quarry" data-name="Blackstone Quarry" style="top: 47%; left: 46.5%;">📍</button>
              <button class="map-location" data-loc="welkenbare-quarry" data-name="Welkenbare Quarry" style="top: 62%; left: 69%;">📍</button>
              <button class="map-location" data-loc="aldspar-mine" data-name="Aldspar Mine" style="top: 49%; left: 31.5%;">📍</button>

              <!-- Fort -->
              <button class="map-location" data-loc="blackstone-fort" data-name="Blackstone Fort" style="top: 33%; left: 81%;">📍</button>

            </div>

            <!-- PRAWA STRONA: PANEL INFO -->
            <div class="map-info-panel">
              <!-- CURRENT -->
              <div class="map-info-section">
                <div class="map-info-title">Current Location</div>
                <div id="current-location-name" class="map-info-name">–</div>
                <div id="current-location-desc" class="map-info-desc">
                  You are nowhere in particular.
                </div>
                <div id="current-location-major-title" class="map-info-subtitle"></div>
                <ul id="current-location-major-list" class="map-info-list"></ul>
              </div>

              <!-- SELECTED -->
              <div class="map-info-section">
                <div class="map-info-title">Selected Location</div>
                <div id="selected-location-name" class="map-info-name">–</div>
                <div id="selected-location-desc" class="map-info-desc">
                  Click a discovered location on the map.
                </div>
                <div id="selected-location-major-title" class="map-info-subtitle"></div>
                <ul id="selected-location-major-list" class="map-info-list"></ul>
              </div>
            </div>
          </div>
        </div>



      <div class="footer">
        <button class="tiny" id="reset-btn">Reset coins</button>
        <button class="tiny" id="hide-btn">Hide</button>
      </div>
    `;

    return container;
  }

  function cacheElements(shadowRoot, elements, widget) {
    elements.wrap = widget;
    elements.dragHandle = shadowRoot.getElementById("drag-handle");
    elements.tabBar = shadowRoot.querySelector(".tab-bar");
    elements.inventoryList = shadowRoot.getElementById("inventory-list");
    elements.invIcon = shadowRoot.getElementById("inv-icon");
    elements.invName = shadowRoot.getElementById("inv-name");
    elements.invQty = shadowRoot.getElementById("inv-qty");
    elements.invDesc = shadowRoot.getElementById("inv-desc");
    elements.invAdd = shadowRoot.getElementById("inv-add");
    elements.resetBtn = shadowRoot.getElementById("reset-btn");
    elements.hideBtn = shadowRoot.getElementById("hide-btn");
    elements.charactersListUnlocked = shadowRoot.getElementById("characters-list-unlocked");
    elements.charactersListLocked = shadowRoot.getElementById("characters-list-locked");
    elements.charSearch = shadowRoot.getElementById("char-search");
    elements.mapWrapper = shadowRoot.getElementById("map-wrapper");
  }
})();
