import { AdminAgentDetails } from "@/widgets/admin-agent-details";
import { AdminOrders } from "@/widgets/admin-orders";
import { AdminProducts } from "@/widgets/admin-products";
export default async function AgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const id = Number((await params).agentId);
  return <AdminAgentDetails agent={id} orders={<AdminOrders agentId={id} />} products={<AdminProducts agentId={id} />} />;
}
