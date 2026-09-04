"use client";

import { useRef, useState } from "react";
import {
  useCreateAddress,
  type Address,
  type AddressInput,
} from "@/entities/address";
import { findCreatedCheckoutAddress } from "./checkoutAddressCreation";

type CreationPhase =
  | "closed"
  | "editing"
  | "saving"
  | "resolving"
  | "resolve-error";

interface PendingAddress {
  input: AddressInput;
  previousIds: number[];
}

interface UseCheckoutAddressCreationProps {
  addresses: Address[];
  canStart: boolean;
  reloadAddresses: () => Promise<Address[]>;
  onAddressSelect: (address: Address | null) => void;
}

export const useCheckoutAddressCreation = ({
  addresses,
  canStart,
  reloadAddresses,
  onAddressSelect,
}: UseCheckoutAddressCreationProps) => {
  const { mutateAsync: createAddress } = useCreateAddress();
  const [phase, setPhase] = useState<CreationPhase>("closed");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingAddress = useRef<PendingAddress | null>(null);
  const isBusy = useRef(false);

  const resolveSavedAddress = async () => {
    const pending = pendingAddress.current;
    if (!pending) return;

    setPhase("resolving");
    setError(null);

    try {
      const refreshedAddresses = await reloadAddresses();
      const createdAddress = findCreatedCheckoutAddress(
        refreshedAddresses,
        pending.previousIds,
        pending.input,
      );

      onAddressSelect(createdAddress);
      setNotice(
        createdAddress
          ? "Новый адрес сохранён и выбран для доставки."
          : "Адрес сохранён. Выберите нужный адрес доставки из обновлённого списка.",
      );
      pendingAddress.current = null;
      setPhase("closed");
    } catch {
      setError(
        "Адрес сохранён, но не удалось обновить список. Повторите загрузку.",
      );
      setPhase("resolve-error");
    }
  };

  const open = () => {
    if (!canStart || isBusy.current || phase !== "closed") return;

    setError(null);
    setNotice(null);
    setPhase("editing");
  };

  const cancel = () => {
    if (isBusy.current) return;

    if (pendingAddress.current) {
      onAddressSelect(null);
      setNotice("Адрес сохранён. Обновите список и выберите адрес доставки.");
    }

    pendingAddress.current = null;
    setError(null);
    setPhase("closed");
  };

  const submit = async (input: AddressInput) => {
    if (isBusy.current || phase !== "editing") return;

    isBusy.current = true;
    setPhase("saving");
    setError(null);
    const pending = {
      input,
      previousIds: addresses.map((address) => address.id),
    };

    try {
      try {
        await createAddress(input);
      } catch {
        setError(
          "Не удалось сохранить адрес. Проверьте данные и повторите попытку.",
        );
        setPhase("editing");
        throw new Error("Не удалось сохранить адрес");
      }

      pendingAddress.current = pending;
      await resolveSavedAddress();
    } finally {
      isBusy.current = false;
    }
  };

  const retry = async () => {
    if (isBusy.current || !pendingAddress.current) return;

    isBusy.current = true;
    try {
      await resolveSavedAddress();
    } finally {
      isBusy.current = false;
    }
  };

  return {
    isOpen: phase !== "closed",
    isSaving: phase === "saving",
    isResolving: phase === "resolving",
    needsReload: phase === "resolve-error",
    error,
    notice,
    open,
    cancel,
    submit,
    retry,
  };
};

export type CheckoutAddressCreation = ReturnType<
  typeof useCheckoutAddressCreation
>;
