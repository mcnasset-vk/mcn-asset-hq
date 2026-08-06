import { FactoryView } from "@/components/views/FactoryView";
import { ModuleGuard } from "@/components/views/ModuleGuard";

export default function FactoryPage() {
  return (
    <ModuleGuard module="factory">
      <FactoryView />
    </ModuleGuard>
  );
}
