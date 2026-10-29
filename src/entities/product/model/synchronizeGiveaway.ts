import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";
import { adminProductKeys } from "./adminQueries";
import { adminGiveawayKeys } from "./adminGiveawayQueries";
import { giveawayKeys } from "./usePublicGiveaway";
import { productKeys } from "./queryKeys";

export interface GiveawaySyncTarget {
  session: number; productId: number; agentId?: number; ownedByCurrentUser: boolean;
  scope: PrivateScope; isCurrent: () => boolean;
  converted?: boolean;
}
async function synchronizeKeys(client: QueryClient, target: Pick<GiveawaySyncTarget, "session" | "scope" | "isCurrent">, keys: QueryKey[], invalidateOnly: QueryKey[] = []) {
  const { session, scope } = target;
  const current = () => scope.isCurrent() && scope.id === session && target.isCurrent();
  const verify = () => { if (!current()) throw new Error("Сессия или доступ изменились"); };
  verify();
  await Promise.all([...keys, ...invalidateOnly].map(queryKey => client.cancelQueries({ queryKey })));
  verify();
  await Promise.all([...keys, ...invalidateOnly].map(queryKey => client.invalidateQueries({ queryKey, refetchType: "none" })));
  verify();
  const results = await Promise.allSettled(keys.map(queryKey => client.refetchQueries({ queryKey, type: "active" }, { throwOnError: true })));
  verify();
  if (results.some(result => result.status === "rejected")) throw new Error("Не удалось обновить связанные данные. Повторите только чтение.");
}
export function synchronizeCreatedGiveaway(client: QueryClient, target: Pick<GiveawaySyncTarget, "session" | "scope" | "isCurrent">) {
  return synchronizeKeys(client, target, [adminGiveawayKeys.histories(target.session), giveawayKeys.active(), target.scope.key(productKeys.userLists())]);
}
export async function synchronizeGiveaway(client: QueryClient, target: GiveawaySyncTarget) {
  const { session, productId, agentId, scope } = target;
  if (scope.id !== session || !scope.isCurrent() || !target.isCurrent()) throw new Error("Сессия или доступ изменились");
  const keys: QueryKey[] = [adminGiveawayKeys.histories(session), adminGiveawayKeys.detail(session, productId),
    giveawayKeys.detail(productId), giveawayKeys.active(), adminProductKeys.detail(session, productId)];
  if (agentId !== undefined) keys.push(adminProductKeys.list(session, agentId));
  if (target.ownedByCurrentUser) keys.push(scope.key(productKeys.userLists()));
  const relations = adminProductKeys.relations(session, productId);
  // До этапа 11 relations читаются из публичного /product/{id}, исключающего GIVEAWAY.
  // Теперь query выбирает admin источник; активные связи можно безопасно перечитать.
  keys.push(relations);
  if (target.converted) {
    const details = [productKeys.detail(productId), productKeys.detail(String(productId))];
    await Promise.all(details.map(queryKey => client.cancelQueries({ queryKey, exact: true })));
    if (!scope.isCurrent() || !target.isCurrent()) throw new Error("Сессия или доступ изменились");
    details.forEach(queryKey => client.removeQueries({ queryKey, exact: true }));
    keys.push(productKeys.lists());
  }
  await synchronizeKeys(client, target, keys);
}
