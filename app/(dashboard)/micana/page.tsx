import { MicanaView } from "@/components/views/MicanaView";
import { ModuleGuard } from "@/components/views/ModuleGuard";

export default function MicanaPage() {
  return (
    <ModuleGuard module="micana">
      <MicanaView />
    </ModuleGuard>
  );
}
