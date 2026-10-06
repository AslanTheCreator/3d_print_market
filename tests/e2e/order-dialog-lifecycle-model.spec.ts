import { expect, test } from "@playwright/test";
import { createOrderDialogLifecycle } from "@/widgets/orders/model/orderDialogLifecycle";

test("late success cannot close or replace the result of a new opening", async () => {
  const lifecycle = createOrderDialogLifecycle(true);
  const operation = lifecycle.generation;
  let resolve!: () => void;
  const gate = new Promise<void>(done => { resolve = done; });
  let closes = 0;
  const success = gate.then(() => { if (lifecycle.isCurrent(operation)) closes++; });
  lifecycle.setOpen(false);
  lifecycle.setOpen(true);
  expect(lifecycle.isCurrent(lifecycle.generation)).toBe(true);
  resolve(); await success;
  expect(closes).toBe(0);
  const current = lifecycle.generation;
  lifecycle.dispose();
  expect(lifecycle.isCurrent(current)).toBe(false);
});

test("an exit from an old opening cannot reset a reopened form, even after its next close", () => {
  const lifecycle = createOrderDialogLifecycle(true);
  lifecycle.setOpen(false);
  const closing = lifecycle.generation;
  let text = "Новый текст";
  const oldExit = () => lifecycle.resetAfterExit(closing, () => { text = ""; });
  lifecycle.setOpen(true);
  oldExit(); expect(text).toBe("Новый текст");
  lifecycle.setOpen(false);
  oldExit(); expect(text).toBe("Новый текст");
  lifecycle.resetAfterExit(lifecycle.generation, () => { text = ""; });
  expect(text).toBe("");
  text = "После unmount";
  lifecycle.dispose();
  lifecycle.resetAfterExit(lifecycle.generation, () => { text = ""; });
  expect(text).toBe("После unmount");
});
