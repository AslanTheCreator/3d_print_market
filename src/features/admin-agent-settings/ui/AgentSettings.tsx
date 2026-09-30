"use client";
import { Stack } from "@mui/material";
import { adminAccountsApi, type AccountsCreateModel } from "@/entities/account";
import { adminAddressesApi, type AddressInput } from "@/entities/address";
import { adminTransfersApi, type TransferInput } from "@/entities/transfer";
import { adminSocialNetworksApi, type SocialNetworkInput } from "@/entities/social-network";
import { RecordSettings } from "./RecordSettings";
import { AgentProfileForm } from "./AgentProfileForm";

const options = (entries: string[][]) => entries.map(([value, label]) => ({ value, label }));
const money = options([["BANK_CARD", "Банковская карта"], ["BANK_SBP", "СБП"], ["CASH", "Наличные"]]);
const sending = options([["PRODUCT_PICKUP", "Самовывоз"], ["TRANSPORT_COMPANY", "Транспортная компания"], ["RUSSIAN_POST", "Почта России"], ["FREE_POST", "Бесплатная доставка"]]);
const social = options([["TELEGRAM", "Telegram"], ["VK", "ВКонтакте"], ["FACEBOOK", "Facebook"], ["WHATSAPP", "WhatsApp"]]);
const currencies = ["RUB", "USD", "EUR", "GBP", "JPY", "CNY"].map((value) => ({ value, label: value }));
const initialAccount: AccountsCreateModel = { transferMoney: "BANK_CARD", username: "", entityValue: "", comment: "" };
const initialTransfer: TransferInput = { sending: "PRODUCT_PICKUP", price: 0, currency: "RUB" };
const initialSocial: SocialNetworkInput = { type: "TELEGRAM", login: "" };
const initialAddress: AddressInput = { country: "Россия", city: "", street: "", houseNumber: "", apartmentNumber: "", index: 0 };
export function AgentSettings({ session, agent }: { session: number | null; agent: number }) {
  const common = { session, agent };
  return <Stack spacing={3}>
    <AgentProfileForm {...common} />
    <RecordSettings {...common} resource="social-networks" title="Контакты" api={adminSocialNetworksApi} initial={initialSocial}
      toInput={({ type, login }) => ({ type, login })} describe={(item) => `${social.find((o) => o.value === item.type)?.label ?? item.type}: ${item.login}`}
      fields={[{ name: "type", label: "Социальная сеть", options: social }, { name: "login", label: "Контакт" }]} />
    <RecordSettings {...common} resource="transfers" title="Доставка" api={adminTransfersApi} initial={initialTransfer}
      toInput={({ sending, price, currency }) => ({ sending, price, currency })} describe={(item) => `${sending.find((o) => o.value === item.sending)?.label ?? item.sending} · ${item.price} ${item.currency}`}
      fields={[{ name: "sending", label: "Способ доставки", options: sending }, { name: "price", label: "Стоимость доставки", numeric: true }, { name: "currency", label: "Валюта доставки", options: currencies }]} />
    <RecordSettings {...common} resource="accounts" title="Реквизиты" api={adminAccountsApi} initial={initialAccount}
      emptyWarning="Реквизиты не заполнены. Добавьте их до первой продажи."
      toInput={({ transferMoney, username, entityValue, comment }) => ({ transferMoney, username, entityValue, comment })}
      describe={(item) => `${money.find((o) => o.value === item.transferMoney)?.label ?? item.transferMoney} · ${item.username}\n${item.entityValue}\n${item.comment ?? ""}`}
      fields={[{ name: "transferMoney", label: "Способ оплаты", options: money }, { name: "username", label: "Получатель" }, { name: "entityValue", label: "Реквизиты для оплаты" }, { name: "comment", label: "Комментарий к оплате" }]} />
    <RecordSettings {...common} resource="addresses" title="Адреса" api={adminAddressesApi} initial={initialAddress}
      toInput={({ country, city, street, houseNumber, apartmentNumber, index }) => ({ country, city, street, houseNumber, apartmentNumber, index })}
      describe={(item) => item.fullAddress || `${item.country}, ${item.city}, ${item.street}, ${item.houseNumber}, ${item.apartmentNumber}, ${item.index}`}
      fields={[{ name: "country", label: "Страна" }, { name: "city", label: "Город" }, { name: "street", label: "Улица" }, { name: "houseNumber", label: "Дом" }, { name: "apartmentNumber", label: "Квартира" }, { name: "index", label: "Почтовый индекс", numeric: true }]} />
  </Stack>;
}
