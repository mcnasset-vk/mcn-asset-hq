import { MdnaView } from "@/components/views/MdnaView";
import { ModuleGuard } from "@/components/views/ModuleGuard";

export default function MdnaPage() {
  return (
    <ModuleGuard module="mdna">
      <MdnaView />
    </ModuleGuard>
  );
}
