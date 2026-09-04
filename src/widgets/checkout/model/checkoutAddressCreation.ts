import type { Address, AddressInput } from "@/entities/address";

const normalizeAddressText = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");

export const findCreatedCheckoutAddress = (
  addresses: readonly Address[],
  previousIds: readonly number[],
  input: AddressInput,
): Address | null => {
  const existingIds = new Set(previousIds);
  const textFields = [
    "country",
    "city",
    "street",
    "houseNumber",
    "apartmentNumber",
  ] as const;
  const matches = addresses.filter(
    (address) =>
      address.status === "ACTIVE" &&
      !existingIds.has(address.id) &&
      address.index === input.index &&
      textFields.every(
        (field) =>
          normalizeAddressText(address[field]) ===
          normalizeAddressText(input[field]),
      ),
  );

  return matches.length === 1 ? matches[0] : null;
};
