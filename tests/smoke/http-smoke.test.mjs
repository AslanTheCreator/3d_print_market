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

const publicShellRoutes = [
  "/",
  "/checkout",
  "/favorites",
  "/catalog/category/32-test",
  "/catalog/901/detail",
];

const protectedDashboardRoutes = [
  "/dashboard",
  "/dashboard/products",
  "/dashboard/products/new",
  "/dashboard/products/1/edit",
  "/dashboard/purchase",
  "/dashboard/sales",
  "/dashboard/settings",
  "/dashboard/security",
];

const protectedAdminRoutes = ["/admin", "/admin/products/42"];

describe("frontend smoke", () => {
  for (const route of publicShellRoutes) {
    it(`returns non-empty HTML for ${route}`, async () => {
      await assertHtmlResponse(route);
    });
  }

  for (const route of [...protectedDashboardRoutes, ...protectedAdminRoutes]) {
    it(`redirects anonymous ${route} requests to login`, async () => {
      const destination = `${route}?tab=payment&tag=a%2Bb&tag=two`;
      const response = await request(destination, {
        redirect: "manual",
      });

      assert.equal(response.status, 307);
      const location = new URL(response.headers.get("location"), BASE_URL);
      assert.equal(location.pathname, "/auth/login");
      assert.deepEqual([...location.searchParams], [["redirect", destination]]);
    });
  }

  it("exposes runtime config for the browser app", async () => {
    const response = await request("/api/config");
    const config = await response.json();

    assert.equal(response.status, 200);
    assert.equal(typeof config.apiUrl, "string");
    assert.ok(config.apiUrl.length > 0);
  });

  it("serves Next.js and public assets", async () => {
    const html = await assertHtmlResponse("/");
    const staticAssetPath = html.match(
      /(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/,
    )?.[1];

    assert.ok(staticAssetPath, "Expected a Next.js static asset in the page HTML");

    const [staticResponse, publicResponse] = await Promise.all([
      request(staticAssetPath),
      request("/fonts/montserrat/Montserrat-Variable.woff2"),
    ]);

    assert.equal(staticResponse.status, 200);
    assert.doesNotMatch(
      staticResponse.headers.get("content-type") ?? "",
      /text\/html/,
    );
    assert.equal(publicResponse.status, 200);
    assert.match(
      publicResponse.headers.get("content-type") ?? "",
      /font\/woff2|application\/font-woff/,
    );
  });
});
