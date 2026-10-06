import { AdminAgentDetails } from "@/widgets/admin-agent-details";
import { AdminOrders } from "@/widgets/admin-orders";
import { AdminProducts } from "@/widgets/admin-products";
import { notFound } from "next/navigation";
import { parsePositiveSafeInteger } from "@/shared/lib";
export default async function AgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const id = parsePositiveSafeInteger((await params).agentId);
  if (id === null) notFound();
  return <AdminAgentDetails agent={id} orders={<AdminOrders agentId={id} />} products={<AdminProducts agentId={id} />} />;
}
