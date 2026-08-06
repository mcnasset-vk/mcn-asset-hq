import { MecModule } from "@/components/views/MecModule";
import { ModuleGuard } from "@/components/views/ModuleGuard";

export default function MecPage() {
  return (
    <ModuleGuard module="mec">
      <MecModule />
    </ModuleGuard>
  );
}
