import { describe, expect, it } from "vitest";
import { shopIdFromSearch, syncLink } from "@/ledger/data/sync";

const VALID = "3f2b1c9e-7a4d-4e21-9b6f-0c8d5e1a2b34";

describe("shopIdFromSearch", () => {
  it("reads a valid shop uuid", () => {
    expect(shopIdFromSearch(`?shop=${VALID}`)).toBe(VALID);
    expect(shopIdFromSearch(`?today=2026-11-15&shop=${VALID}`)).toBe(VALID);
    expect(shopIdFromSearch(`?shop=${VALID.toUpperCase()}`)).toBe(VALID);
  });

  /**
   * This is what keeps the automated tester in its own browser-local sandbox:
   * with no usable shop parameter the app never talks to the network at all.
   */
  it("returns null for anything that is not a uuid, so the page stays local", () => {
    for (const search of [
      "",
      "?",
      "?today=2026-11-15",
      "?shop=",
      "?shop=123",
      "?shop=not-a-uuid",
      "?shop=3f2b1c9e7a4d4e219b6f0c8d5e1a2b34",
      `?shop=${VALID}x`,
      "?shop=../../etc/passwd",
      "?shop=<script>alert(1)</script>",
      "?q=What are your timings?",
    ]) {
      expect(shopIdFromSearch(search), search || "(empty)").toBeNull();
    }
  });

  it("does not confuse a similarly named parameter", () => {
    expect(shopIdFromSearch(`?shopId=${VALID}`)).toBeNull();
    expect(shopIdFromSearch(`?myshop=${VALID}`)).toBeNull();
  });
});

describe("syncLink", () => {
  it("builds a link that opens the same ledger elsewhere", () => {
    expect(syncLink(VALID, "https://hisaab-ayrus3.vercel.app")).toBe(
      `https://hisaab-ayrus3.vercel.app/?shop=${VALID}`,
    );
  });

  it("does not double the slash", () => {
    expect(syncLink(VALID, "https://example.com/")).toBe(`https://example.com/?shop=${VALID}`);
  });

  it("round-trips through the reader", () => {
    const link = syncLink(VALID, "https://example.com");
    expect(shopIdFromSearch(new URL(link).search)).toBe(VALID);
  });
});
