import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for gmailService.js dedup logic.
 *
 * We mock:
 * - settings.js getAccessToken → returns a fake token
 * - global fetch → returns fake Gmail API responses
 * - localStorage → seeded with existing goals
 */

// Mock settings module
vi.mock("../js/settings.js", () => ({
  getAccessToken: () => "fake-token",
  getConfig: () => null,
}));

const STORAGE_KEY = "goal-tracker-data";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("gmailService — fetchLatestEmails dedup", () => {
  it("skips fetching content for already-processed email IDs", async () => {
    // Seed localStorage with a goal that has sourceEmailId = "msg_already"
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        goals: [
          {
            id: "g_1",
            title: "已處理的目標",
            category: "核心專案",
            status: "active",
            createdAt: "2026-01-01",
            progress: 0,
            subtasks: [],
            sourceEmailId: "msg_already",
            sourceLink: "https://mail.google.com/mail/u/0/#inbox/msg_already",
          },
        ],
      })
    );

    const fetchCalls = [];

    // Mock fetch: list returns 2 message IDs, get returns message content
    global.fetch = vi.fn(async (url) => {
      fetchCalls.push(url);

      if (url.includes("/messages?")) {
        // List endpoint — return 2 IDs: one processed, one new
        return {
          ok: true,
          json: async () => ({
            messages: [{ id: "msg_already" }, { id: "msg_new" }],
          }),
        };
      }

      if (url.includes("/messages/msg_new")) {
        return {
          ok: true,
          json: async () => ({
            id: "msg_new",
            payload: {
              headers: [
                { name: "From", value: "sender@test.com" },
                { name: "To", value: "me@test.com" },
                { name: "Subject", value: "New Email" },
                { name: "Date", value: "2026-01-10" },
              ],
              body: { data: "" },
            },
          }),
        };
      }

      // If msg_already is fetched, the test should notice
      if (url.includes("/messages/msg_already")) {
        return {
          ok: true,
          json: async () => ({
            id: "msg_already",
            payload: {
              headers: [
                { name: "From", value: "old@test.com" },
                { name: "To", value: "me@test.com" },
                { name: "Subject", value: "Old Email" },
                { name: "Date", value: "2026-01-01" },
              ],
              body: { data: "" },
            },
          }),
        };
      }

      return { ok: false };
    });

    const { fetchLatestEmails } = await import("../js/gmailService.js");
    const emails = await fetchLatestEmails(10);

    // Should only return the new email, not the already-processed one
    expect(emails).toHaveLength(1);
    expect(emails[0].id).toBe("msg_new");

    // Verify that fetch was NOT called for msg_already's content
    const contentFetches = fetchCalls.filter((url) => url.includes("/messages/msg_"));
    expect(contentFetches.some((url) => url.includes("msg_already"))).toBe(false);
    expect(contentFetches.some((url) => url.includes("msg_new"))).toBe(true);
  });

  it("fetches all emails when localStorage has no goals", async () => {
    // Empty localStorage — no dedup data
    global.fetch = vi.fn(async (url) => {
      if (url.includes("/messages?")) {
        return {
          ok: true,
          json: async () => ({
            messages: [{ id: "msg_x" }, { id: "msg_y" }],
          }),
        };
      }
      // Return message content for both
      return {
        ok: true,
        json: async () => ({
          id: url.includes("msg_x") ? "msg_x" : "msg_y",
          payload: {
            headers: [
              { name: "From", value: "test@test.com" },
              { name: "To", value: "me@test.com" },
              { name: "Subject", value: "Test" },
              { name: "Date", value: "2026-01-10" },
            ],
            body: { data: "" },
          },
        }),
      };
    });

    const { fetchLatestEmails } = await import("../js/gmailService.js");
    const emails = await fetchLatestEmails(10);

    expect(emails).toHaveLength(2);
  });
});
