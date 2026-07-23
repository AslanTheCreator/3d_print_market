import { expect, test } from "@playwright/test";
import { getSafeExternalUrl } from "../../src/shared/lib";

test.describe("safe external URL", () => {
  test("accepts trimmed absolute HTTP and HTTPS links", () => {
    expect(getSafeExternalUrl("  https://t.me/seller  ")).toBe(
      "https://t.me/seller",
    );
    expect(getSafeExternalUrl("http://example.com/product")).toBe(
      "http://example.com/product",
    );
  });

  test("rejects empty, relative and unsafe links", () => {
    expect(getSafeExternalUrl("")).toBeNull();
    expect(getSafeExternalUrl("   ")).toBeNull();
    expect(getSafeExternalUrl("/seller")).toBeNull();
    expect(getSafeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeExternalUrl("data:text/html,test")).toBeNull();
    expect(getSafeExternalUrl("tg://resolve?domain=seller")).toBeNull();
    expect(getSafeExternalUrl("not a URL")).toBeNull();
  });
});
