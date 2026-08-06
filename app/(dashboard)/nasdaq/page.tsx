import { ModuleGuard } from "@/components/views/ModuleGuard";
import { NasdaqView } from "@/components/views/NasdaqView";

export default function NasdaqPage() {
  return (
    <ModuleGuard module="nasdaq">
      <NasdaqView />
    </ModuleGuard>
  );
}
