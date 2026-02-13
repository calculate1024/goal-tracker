import { describe, it, expect } from "vitest";
import {
  generateGmailLink,
  buildEmailSubjectIndex,
  matchGoalToEmail,
  formatEmailsForPrompt,
} from "../js/workflow.js";

describe("generateGmailLink", () => {
  it("produces correct Gmail URL", () => {
    const link = generateGmailLink("18f1a2b3c4d5e6f7");
    expect(link).toBe("https://mail.google.com/mail/u/0/#inbox/18f1a2b3c4d5e6f7");
  });
});

describe("buildEmailSubjectIndex", () => {
  it("builds normalized subject → email mapping", () => {
    const emails = [
      { id: "e1", subject: "Meeting Tomorrow", from: "a@b.com", to: "c@d.com", date: "2026-01-01", body: "" },
      { id: "e2", subject: "Invoice #123", from: "x@y.com", to: "c@d.com", date: "2026-01-02", body: "" },
    ];

    const index = buildEmailSubjectIndex(emails);
    expect(index.size).toBe(2);
    expect(index.get("meeting tomorrow")).toEqual(emails[0]);
    expect(index.get("invoice #123")).toEqual(emails[1]);
  });

  it("skips emails with empty subject", () => {
    const emails = [
      { id: "e1", subject: "", from: "a@b.com", to: "c@d.com", date: "2026-01-01", body: "" },
      { id: "e2", subject: null, from: "a@b.com", to: "c@d.com", date: "2026-01-01", body: "" },
      { id: "e3", subject: "Valid Subject", from: "a@b.com", to: "c@d.com", date: "2026-01-01", body: "" },
    ];

    const index = buildEmailSubjectIndex(emails);
    expect(index.size).toBe(1);
    expect(index.has("valid subject")).toBe(true);
  });
});

describe("matchGoalToEmail", () => {
  const emails = [
    { id: "e1", subject: "Project Alpha Update", from: "a@b.com", to: "c@d.com", date: "2026-01-01", body: "" },
    { id: "e2", subject: "Weekly Report", from: "x@y.com", to: "c@d.com", date: "2026-01-02", body: "" },
    { id: "e3", subject: "AB", from: "s@t.com", to: "c@d.com", date: "2026-01-03", body: "" }, // short subject
  ];

  function makeIndex() {
    return buildEmailSubjectIndex(emails);
  }

  it("exact match (case insensitive)", () => {
    const index = makeIndex();
    const result = matchGoalToEmail({ source_subject: "project alpha update" }, index);
    expect(result).toEqual(emails[0]);
  });

  it("exact match with different casing", () => {
    const index = makeIndex();
    const result = matchGoalToEmail({ source_subject: "WEEKLY REPORT" }, index);
    expect(result).toEqual(emails[1]);
  });

  it("fuzzy match — needle includes subject", () => {
    const index = makeIndex();
    // "Weekly Report" (14 chars) included in "Weekly Report Summary" (21 chars)
    // shorter/longer = 14/21 ≈ 0.67 >= 0.5 → match
    const result = matchGoalToEmail({ source_subject: "Weekly Report Summary" }, index);
    expect(result).toEqual(emails[1]);
  });

  it("fuzzy match — subject includes needle", () => {
    const index = makeIndex();
    // "Alpha Update" (12 chars) included in "Project Alpha Update" (20 chars)
    // shorter/longer = 12/20 = 0.6 >= 0.5 → match
    const result = matchGoalToEmail({ source_subject: "Alpha Update" }, index);
    expect(result).toEqual(emails[0]);
  });

  it("rejects short needle for fuzzy matching (< 4 chars)", () => {
    const index = makeIndex();
    // "We" (2 chars) is contained in "Weekly Report" but < 4 so fuzzy match is skipped
    // and there's no exact match for "we" in the index
    const result = matchGoalToEmail({ source_subject: "We" }, index);
    expect(result).toBeNull();
  });

  it("rejects when length ratio < 0.5", () => {
    const index = makeIndex();
    // "Report" (6 chars) vs "Project Alpha Update" (20 chars normalized)
    // shorter/longer = 6/20 = 0.3 < 0.5 → no match even though includes
    const result = matchGoalToEmail({ source_subject: "Repor" }, index);
    expect(result).toBeNull();
  });

  it("returns null when source_subject is missing", () => {
    const index = makeIndex();
    const result = matchGoalToEmail({}, index);
    expect(result).toBeNull();
  });

  it("returns null when source_subject is empty string", () => {
    const index = makeIndex();
    const result = matchGoalToEmail({ source_subject: "" }, index);
    expect(result).toBeNull();
  });
});

describe("formatEmailsForPrompt", () => {
  it("includes Email-ID in the formatted output", () => {
    const emails = [
      { id: "18f1abc", subject: "Test Subject", from: "a@b.com", to: "c@d.com", date: "2026-01-01", body: "Hello" },
    ];
    const output = formatEmailsForPrompt(emails);
    expect(output).toContain("Email-ID: 18f1abc");
    expect(output).toContain("Subject: Test Subject");
    expect(output).toContain("Hello");
  });

  it("includes Email-ID for each email in multi-email batch", () => {
    const emails = [
      { id: "id_aaa", subject: "First", from: "a@b.com", to: "c@d.com", date: "2026-01-01", body: "body1" },
      { id: "id_bbb", subject: "Second", from: "x@y.com", to: "c@d.com", date: "2026-01-02", body: "body2" },
    ];
    const output = formatEmailsForPrompt(emails);
    expect(output).toContain("Email-ID: id_aaa");
    expect(output).toContain("Email-ID: id_bbb");
  });
});
