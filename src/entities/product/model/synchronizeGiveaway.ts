import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PrivateScope } from "@/shared/lib/query";
import { adminProductKeys } from "./adminQueries";
import { adminGiveawayKeys } from "./adminGiveawayQueries";
import { giveawayKeys } from "./usePublicGiveaway";
import { productKeys } from "./queryKeys";

export interface GiveawaySyncTarget {
  session: number; productId: number; agentId?: number; ownedByCurrentUser: boolean;
  scope: PrivateScope; isCurrent: () => boolean;
}
export async function synchronizeGiveaway(client: QueryClient, target: GiveawaySyncTarget) {
  const { session, productId, agentId, scope } = target;
  const current = () => scope.isCurrent() && scope.id === session && target.isCurrent();
  const verify = () => { if (!current()) throw new Error("Сессия или доступ изменились"); };
  const keys: QueryKey[] = [adminGiveawayKeys.histories(session), adminGiveawayKeys.detail(session, productId),
    giveawayKeys.detail(productId), giveawayKeys.active(), adminProductKeys.detail(session, productId)];
  if (agentId !== undefined) keys.push(adminProductKeys.list(session, agentId));
  if (target.ownedByCurrentUser) keys.push(scope.key(productKeys.userLists()));
  // До этапа 11 relations читаются из публичного /product/{id}, исключающего GIVEAWAY.
  const relations = adminProductKeys.relations(session, productId);
  verify();
  await Promise.all([...keys, relations].map(queryKey => client.cancelQueries({ queryKey })));
  verify();
  await Promise.all([...keys, relations].map(queryKey => client.invalidateQueries({ queryKey, refetchType: "none" })));
  verify();
  const results = await Promise.allSettled(keys.map(queryKey => client.refetchQueries({ queryKey, type: "active" }, { throwOnError: true })));
  verify();
  if (results.some(result => result.status === "rejected")) throw new Error("Не удалось обновить связанные данные. Повторите только чтение.");
}
