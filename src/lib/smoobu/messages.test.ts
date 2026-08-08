import { describe, expect, it } from "vitest";
import { stripHtmlToText, toDisplayMessage } from "./messages";

describe("Smoobu messages", () => {
  it("uses plain text when Smoobu provides it", () => {
    expect(
      toDisplayMessage({
        id: 1,
        subject: "Hello",
        message: "Plain message",
        messageHtml: "<p>HTML message</p>",
        type: 1
      })
    ).toMatchObject({
      body: "Plain message",
      direction: "incoming"
    });
  });

  it("strips HTML instead of injecting it", () => {
    expect(stripHtmlToText('<p>Please send details</p><script>alert("bad")</script>')).toBe(
      "Please send details"
    );
  });

  it("renders outbox messages distinctly", () => {
    expect(
      toDisplayMessage({
        id: 2,
        subject: null,
        message: "",
        htmlMessage: "<p>Thanks&nbsp;Jane</p>",
        type: 2
      })
    ).toMatchObject({
      body: "Thanks Jane",
      direction: "outgoing"
    });
  });
});
