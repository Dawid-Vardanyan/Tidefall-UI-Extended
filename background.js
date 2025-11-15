"use strict";

const TOGGLE_COMMAND = "toggle-counter";

async function broadcastToAllTabs(message) {
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    try {
      await browser.tabs.sendMessage(tab.id, message);
    } catch (error) {
      // Ignore tabs where the content script is not injected (e.g. internal pages)
    }
  }
}

async function handleCommand(command) {
  if (command !== TOGGLE_COMMAND) return;

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    await browser.tabs.sendMessage(tab.id, { type: "toggle" });
  } catch (error) {
    // Content script may be unavailable on some pages (about:, moz-extension:, etc.)
  }
}

async function handleRuntimeMessage(message) {
  if (!message || typeof message !== "object") return;

  if (message.type === "getHidden") {
    const { hidden = false } = await browser.storage.local.get({ hidden: false });
    return { hidden };
  }

  if (message.type === "setHidden") {
    const hidden = Boolean(message.hidden);
    await browser.storage.local.set({ hidden });
    await broadcastToAllTabs({ type: "setHidden", hidden });
    return { ok: true };
  }
  
  if (message.type === "getQuestHidden") {
    const { questTrackerHidden = false } = await browser.storage.local.get({
      questTrackerHidden: false
    });
    return { questHidden: questTrackerHidden };
  }

  if (message.type === "setQuestHidden") {
    const hidden = Boolean(message.hidden);
    await browser.storage.local.set({ questTrackerHidden: hidden });
    await broadcastToAllTabs({ type: "questHiddenUpdated", hidden });
    return { ok: true };
  }

  if (message.type === "clearAndRestart") {
    await browser.storage.local.clear();
    setTimeout(() => browser.runtime.reload(), 50);
    return { ok: true };
  }
}

browser.commands.onCommand.addListener(handleCommand);
browser.runtime.onMessage.addListener(handleRuntimeMessage);
