import { describe, it, expect, beforeEach } from "vitest";

/**
 * renderer.js imports dom.js (which does getElementById at load time)
 * and store.js. We set up a minimal DOM before importing so all
 * getElementById calls succeed.
 *
 * We test the source-link rendering by using store to add goals,
 * then triggering renderAll() and inspecting the DOM.
 */

function setupDOM() {
  document.body.innerHTML = `
    <span id="totalCount"></span>
    <span id="completedCount"></span>
    <span id="onTrackCount"></span>
    <span id="overdueCount"></span>
    <select id="filterCategory"></select>
    <select id="filterStatus"></select>
    <select id="sortBy"></select>
    <div id="goalContainer"></div>
    <div id="goalModal"></div>
    <div id="modalOverlay"></div>
    <button id="modalClose"></button>
    <h2 id="modalTitle"></h2>
    <form id="goalForm"></form>
    <input id="goalId" />
    <input id="goalTitle" />
    <select id="goalCategory"></select>
    <input id="goalDeadline" />
    <div id="subtaskContainer"></div>
    <button id="addSubtaskBtn"></button>
    <button id="emailToGoalBtn"></button>
    <div id="toast"></div>
    <button id="openFormBtn"></button>
    <button id="exportBtn"></button>
    <button id="importBtn"></button>
    <input id="importFileInput" />
    <button id="openSettingsBtn"></button>
    <div id="settingsModal"></div>
    <div id="settingsOverlay"></div>
    <button id="settingsClose"></button>
    <form id="settingsForm"></form>
    <input id="googleClientId" />
    <input id="aiApiKey" />
    <button id="testConnectionBtn"></button>
    <span id="testResult"></span>
    <button id="connectGmailBtn"></button>
    <button id="disconnectGmailBtn"></button>
    <span id="gmailAuthStatus"></span>
    <button id="saveApiKeyBtn"></button>
    <button id="settingsImportBtn"></button>
    <input id="settingsImportFile" />
    <span id="settingsImportResult"></span>
    <span id="keyResult"></span>
  `;
}

beforeEach(() => {
  localStorage.clear();
  setupDOM();
});

describe("renderer — source link", () => {
  it("renders source link when goal has https sourceLink", async () => {
    // Must set up DOM before importing modules that call getElementById
    const { addGoal, importState } = await import("../js/store.js");
    // Reset DOM refs by re-importing dom (vitest caches, but DOM is already set up)
    await import("../js/dom.js");
    const { renderAll } = await import("../js/renderer.js");

    importState(JSON.stringify({ goals: [] }), "overwrite");
    addGoal({
      title: "有連結的目標",
      category: "核心專案",
      sourceEmailId: "msg_link_test",
      sourceLink: "https://mail.google.com/mail/u/0/#inbox/msg_link_test",
    });

    renderAll();

    const container = document.getElementById("goalContainer");
    const sourceLink = container.querySelector(".goal-card__source-link");
    expect(sourceLink).not.toBeNull();
    expect(sourceLink.href).toBe("https://mail.google.com/mail/u/0/#inbox/msg_link_test");
    expect(sourceLink.target).toBe("_blank");
    expect(sourceLink.rel).toBe("noopener noreferrer");
  });

  it("does not render source element when goal has no sourceLink", async () => {
    const { addGoal, importState } = await import("../js/store.js");
    await import("../js/dom.js");
    const { renderAll } = await import("../js/renderer.js");

    importState(JSON.stringify({ goals: [] }), "overwrite");
    addGoal({
      title: "無連結的目標",
      category: "日常營運",
    });

    renderAll();

    const container = document.getElementById("goalContainer");
    const sourceEl = container.querySelector(".goal-card__source");
    expect(sourceEl).toBeNull();
  });

  it("rejects non-https sourceLink (e.g. javascript:)", async () => {
    const { addGoal, importState } = await import("../js/store.js");
    await import("../js/dom.js");
    const { renderAll } = await import("../js/renderer.js");

    importState(JSON.stringify({ goals: [] }), "overwrite");
    addGoal({
      title: "惡意連結目標",
      category: "核心專案",
      sourceEmailId: "msg_xss",
      sourceLink: "javascript:alert(1)",
    });

    renderAll();

    const container = document.getElementById("goalContainer");
    const sourceEl = container.querySelector(".goal-card__source");
    expect(sourceEl).toBeNull();
  });
});
