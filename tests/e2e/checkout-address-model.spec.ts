import { expect, test } from "@playwright/test";
import type { Address, AddressInput } from "@/entities/address";
import { findCreatedCheckoutAddress } from "@/widgets/checkout/model/checkoutAddressCreation";

const input: AddressInput = {
  country: "Россия",
  city: "Санкт-Петербург",
  street: "Невский проспект",
  houseNumber: "25А",
  apartmentNumber: "17",
  index: 191025,
};

const address = (
  id: number,
  overrides: Partial<Address> = {},
): Address => ({
  ...input,
  id,
  status: "ACTIVE",
  fullAddress: "Россия, Санкт-Петербург, Невский проспект 25А, кв. 17",
  ...overrides,
});

test.describe("checkout address creation model", () => {
  test("finds the only new matching address without relying on order or maximum ID", () => {
    const createdAddress = address(7);
    const addresses = [
      address(900, { street: "Другая улица" }),
      createdAddress,
      address(50),
    ];

    expect(findCreatedCheckoutAddress(addresses, [50], input)).toBe(
      createdAddress,
    );
    expect(findCreatedCheckoutAddress([createdAddress], [], input)).toBe(
      createdAddress,
    );
  });

  test("does not select an existing address even when its input matches", () => {
    expect(findCreatedCheckoutAddress([address(50)], [50], input)).toBeNull();
    expect(findCreatedCheckoutAddress([], [], input)).toBeNull();
  });

  test("requires manual selection when multiple new addresses match", () => {
    expect(
      findCreatedCheckoutAddress([address(7), address(8)], [], input),
    ).toBeNull();
  });

  test("ignores deleted addresses", () => {
    const createdAddress = address(7);

    expect(
      findCreatedCheckoutAddress(
        [address(8, { status: "DELETED" }), createdAddress],
        [],
        input,
      ),
    ).toBe(createdAddress);
    expect(
      findCreatedCheckoutAddress([address(8, { status: "DELETED" })], [], input),
    ).toBeNull();
  });

  test("normalizes case and whitespace in all string input fields", () => {
    const normalizedAddress = address(7, {
      country: "  РОССИЯ  ",
      city: "  САНКТ-ПЕТЕРБУРГ ",
      street: " Невский   ПРОСПЕКТ ",
      houseNumber: " 25а ",
      apartmentNumber: " 17 ",
      fullAddress: "Серверное представление адреса",
    });

    expect(findCreatedCheckoutAddress([normalizedAddress], [], input)).toBe(
      normalizedAddress,
    );
    expect(
      findCreatedCheckoutAddress(
        [address(8, { apartmentNumber: "" })],
        [],
        { ...input, apartmentNumber: "   " },
      )?.id,
    ).toBe(8);
  });

  test("compares every AddressInput field instead of the formatted address", () => {
    const mismatches: Partial<Address>[] = [
      { country: "Беларусь" },
      { city: "Москва" },
      { street: "Другая улица" },
      { houseNumber: "26А" },
      { apartmentNumber: "18" },
      { index: 191026 },
    ];

    for (const mismatch of mismatches) {
      expect(
        findCreatedCheckoutAddress([address(7, mismatch)], [], input),
      ).toBeNull();
    }
  });
});
