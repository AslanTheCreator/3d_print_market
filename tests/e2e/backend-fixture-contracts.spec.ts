import { expect, test } from "@playwright/test";
import { backendContractRejection } from "./helpers/backendContracts";

test("shared fixtures reject retired mutations and never serve anonymous ORDER evidence", () => {
  const result = (method: string, path: string, authorization?: string) => backendContractRejection(method, new URL(path, "http://fixture.invalid"), authorization, [501]);
  expect(result("POST", "/order/1/FAILED")?.status).toBe(404);
  expect(result("POST", "/order/orders/1/dispute/COMPLETED")?.status).toBe(404);
  expect(result("DELETE", "/images?tag=ORDER&ids=501")?.status).toBe(400);
  expect(result("GET", "/images?ids=501")).toEqual({ status: 200, body: [] });
  expect(result("GET", "/images?ids=501", "Bearer fixture")).toBeNull();
  expect(result("GET", "/images?ids=77")).toBeNull();
  expect(result("POST", "/order/1/CANCELLED")).toBeNull();
});
