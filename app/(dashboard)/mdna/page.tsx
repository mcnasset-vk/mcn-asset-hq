import { MdnaDivisionView } from "@/components/views/MdnaDivisionView";
import { ModuleGuard } from "@/components/views/ModuleGuard";

/**
 * The MDNA division summary spans four business lines, so it is super-admin
 * only: a CIO scoped to one of them would see zeroes for the rest, which reads
 * as "nothing is happening" rather than "you cannot see this".
 */
export default function MdnaDivisionPage() {
  return (
    <ModuleGuard module="division">
      <MdnaDivisionView />
    </ModuleGuard>
  );
}
