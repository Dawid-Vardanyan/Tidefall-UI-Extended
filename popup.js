"use strict";

async function sendToExtension(message) {
  return browser.runtime.sendMessage(message);
}

async function initializePopup() {
  const mainToggle = document.getElementById("toggle-main");
  const questToggle = document.getElementById("toggle-quest");
  const clearButton = document.getElementById("clear");

  if (!mainToggle || !questToggle || !clearButton) return;

  // --- Main window state via existing background logic ---
  try {
    const { hidden } = await sendToExtension({ type: "getHidden" });
    mainToggle.checked = !hidden;
  } catch (e) {
    console.error("Failed to get main window state", e);
    mainToggle.checked = true;
  }

  // --- Quest tracker state handled directly in content scripts ---
  try {
    const { questHidden } = await sendToExtension({ type: "getQuestHidden" });
    questToggle.checked = !questHidden;
  } catch (e) {
    console.error("Failed to get quest tracker state", e);
    questToggle.checked = true; // default: visible
  }

  mainToggle.addEventListener("change", async () => {
    await sendToExtension({
      type: "setHidden",
      hidden: !mainToggle.checked
    });
  });

  questToggle.addEventListener("change", async () => {
    await sendToExtension({
      type: "setQuestHidden",
      hidden: !questToggle.checked
    });
  });

  clearButton.addEventListener("click", async () => {
    clearButton.disabled = true;
    await sendToExtension({ type: "clearAndRestart" });
  });
}

initializePopup().catch((error) =>
  console.error("Failed to initialise popup", error)
);
