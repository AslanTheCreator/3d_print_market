import { DashboardProductsWidget } from "@/widgets/dashboard-products";
import { UserProductsList } from "@/widgets/user-products";

export default function UserProductsPage() {
  return (
    <DashboardProductsWidget>
      <UserProductsList />
    </DashboardProductsWidget>
  );
}
