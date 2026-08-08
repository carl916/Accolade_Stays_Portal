export type SmoobuDisplayMessage = {
  id: number;
  subject: string;
  body: string;
  direction: "incoming" | "outgoing";
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripHtmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toDisplayMessage(message: {
  id: number;
  subject?: string | null;
  message?: string | null;
  messageHtml?: string | null;
  htmlMessage?: string | null;
  type: number;
}): SmoobuDisplayMessage {
  const plainText = message.message?.trim();
  const htmlText = stripHtmlToText(message.messageHtml ?? message.htmlMessage ?? "");

  return {
    id: message.id,
    subject: message.subject?.trim() ?? "",
    body: plainText || htmlText || "No message text available.",
    direction: message.type === 1 ? "incoming" : "outgoing"
  };
}
