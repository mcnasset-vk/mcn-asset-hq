import { CommissionsView } from "@/components/views/CommissionsView";
import { ModuleGuard } from "@/components/views/ModuleGuard";

export default function CommissionsPage() {
  return (
    <ModuleGuard module="commissions">
      <CommissionsView />
    </ModuleGuard>
  );
}
