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

const assertHtmlResponse = async (path) => {
  const response = await request(path);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.match(html, /<html/i);
  assert.ok(html.length > 1000);

  return html;
};

const publicShellRoutes = ["/", "/checkout", "/favorites"];

const protectedDashboardRoutes = [
  "/dashboard/products",
  "/dashboard/products/new",
  "/dashboard/sales",
];

describe("frontend smoke", () => {
  for (const route of publicShellRoutes) {
    it(`returns non-empty HTML for ${route}`, async () => {
      await assertHtmlResponse(route);
    });
  }

  for (const route of protectedDashboardRoutes) {
    it(`redirects anonymous ${route} requests to login`, async () => {
      const response = await request(route, {
        redirect: "manual",
      });

      assert.match(String(response.status), /^30[1278]$/);
      assert.match(response.headers.get("location") ?? "", /\/auth\/login/);
    });
  }

  it("exposes runtime config for the browser app", async () => {
    const response = await request("/api/config");
    const config = await response.json();

    assert.equal(response.status, 200);
    assert.equal(typeof config.apiUrl, "string");
    assert.ok(config.apiUrl.length > 0);
  });
});
