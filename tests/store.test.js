import { describe, it, expect, beforeEach } from "vitest";

// store.js reads localStorage at module load, so we clear it first
beforeEach(() => {
  localStorage.clear();
});

// Dynamic import to get a fresh module per test would be ideal,
// but vitest caches modules. Instead we use importState("overwrite")
// to reset state between tests.

describe("store — source fields", () => {
  it("addGoal with sourceEmailId and sourceLink stores them correctly", async () => {
    // Fresh import after localStorage clear
    const { addGoal, getGoals } = await import("../js/store.js");
    // Reset state
    const { importState } = await import("../js/store.js");
    importState(JSON.stringify({ goals: [] }), "overwrite");

    const goal = addGoal({
      title: "測試目標",
      category: "核心專案",
      sourceEmailId: "msg_abc123",
      sourceLink: "https://mail.google.com/mail/u/0/#inbox/msg_abc123",
    });

    expect(goal.sourceEmailId).toBe("msg_abc123");
    expect(goal.sourceLink).toBe("https://mail.google.com/mail/u/0/#inbox/msg_abc123");

    const goals = getGoals();
    const found = goals.find((g) => g.id === goal.id);
    expect(found.sourceEmailId).toBe("msg_abc123");
    expect(found.sourceLink).toBe("https://mail.google.com/mail/u/0/#inbox/msg_abc123");
  });

  it("addGoal without source fields defaults to null", async () => {
    const { addGoal, importState } = await import("../js/store.js");
    importState(JSON.stringify({ goals: [] }), "overwrite");

    const goal = addGoal({
      title: "無來源目標",
      category: "日常營運",
    });

    expect(goal.sourceEmailId).toBeNull();
    expect(goal.sourceLink).toBeNull();
  });
});

describe("store — getProcessedEmailIds", () => {
  it("returns Set of non-null sourceEmailIds", async () => {
    const { addGoal, getProcessedEmailIds, importState } = await import("../js/store.js");
    importState(JSON.stringify({ goals: [] }), "overwrite");

    addGoal({ title: "G1", category: "核心專案", sourceEmailId: "email_1", sourceLink: "https://example.com/1" });
    addGoal({ title: "G2", category: "核心專案", sourceEmailId: "email_2", sourceLink: "https://example.com/2" });
    addGoal({ title: "G3", category: "核心專案" }); // no source

    const ids = getProcessedEmailIds();
    expect(ids).toBeInstanceOf(Set);
    expect(ids.size).toBe(2);
    expect(ids.has("email_1")).toBe(true);
    expect(ids.has("email_2")).toBe(true);
  });

  it("returns empty Set when no goals exist", async () => {
    const { getProcessedEmailIds, importState } = await import("../js/store.js");
    importState(JSON.stringify({ goals: [] }), "overwrite");

    const ids = getProcessedEmailIds();
    expect(ids).toBeInstanceOf(Set);
    expect(ids.size).toBe(0);
  });
});

describe("store — importState migration", () => {
  it("overwrite mode migrates old goals missing source fields", async () => {
    const { importState, getGoals } = await import("../js/store.js");

    // Old format: goals without sourceEmailId / sourceLink
    const oldData = JSON.stringify({
      goals: [
        { id: "g_old1", title: "舊目標", category: "核心專案", status: "active", createdAt: "2026-01-01", progress: 0, subtasks: [] },
      ],
    });

    const result = importState(oldData, "overwrite");
    expect(result.ok).toBe(true);

    const goals = getGoals();
    const migrated = goals.find((g) => g.id === "g_old1");
    expect(migrated).toBeDefined();
    expect(migrated.sourceEmailId).toBeNull();
    expect(migrated.sourceLink).toBeNull();
  });

  it("merge mode migrates old goals missing source fields", async () => {
    const { importState, getGoals } = await import("../js/store.js");
    // Start with empty state
    importState(JSON.stringify({ goals: [] }), "overwrite");

    const mergeData = JSON.stringify({
      goals: [
        { id: "g_merge1", title: "合併目標", category: "專業成長", status: "active", createdAt: "2026-01-15", progress: 50, subtasks: [] },
      ],
    });

    const result = importState(mergeData, "merge");
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);

    const goals = getGoals();
    const merged = goals.find((g) => g.id === "g_merge1");
    expect(merged).toBeDefined();
    expect(merged.sourceEmailId).toBeNull();
    expect(merged.sourceLink).toBeNull();
  });
});

describe("store — deleteGoal updates dedup set", () => {
  it("getProcessedEmailIds excludes deleted goal's email ID", async () => {
    const { addGoal, deleteGoal, getProcessedEmailIds, importState } = await import("../js/store.js");
    importState(JSON.stringify({ goals: [] }), "overwrite");

    const goal = addGoal({
      title: "要刪除的目標",
      category: "核心專案",
      sourceEmailId: "email_delete_me",
      sourceLink: "https://mail.google.com/mail/u/0/#inbox/email_delete_me",
    });

    expect(getProcessedEmailIds().has("email_delete_me")).toBe(true);

    deleteGoal(goal.id);

    expect(getProcessedEmailIds().has("email_delete_me")).toBe(false);
  });
});
