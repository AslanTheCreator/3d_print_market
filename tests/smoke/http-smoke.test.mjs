import assert from "node:assert/strict";
import { describe, it } from "node:test";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const request = async (path, init) => {
  try {
    return await fetch(new URL(path, BASE_URL), init);
  } catch (error) {
    throw new Error(
      `Frontend is not available at ${BASE_URL}. Start the app before running smoke tests.`,
      { cause: error },
    );
  }
};

describe("frontend smoke", () => {
  it("returns non-empty HTML for the home page", async () => {
    const response = await request("/");
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(html, /<html/i);
    assert.ok(html.length > 1000);
  });

  it("returns public checkout shell for anonymous users", async () => {
    const response = await request("/checkout");
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(html, /<html/i);
  });

  it("redirects anonymous dashboard requests to login", async () => {
    const response = await request("/dashboard/products", {
      redirect: "manual",
    });

    assert.match(String(response.status), /^30[1278]$/);
    assert.match(response.headers.get("location") ?? "", /\/auth\/login/);
  });
});
