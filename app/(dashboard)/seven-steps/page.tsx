import { SevenStepsView } from "@/components/views/SevenStepsView";
import { SuperAdminGuard } from "@/components/views/SuperAdminGuard";

export default function SevenStepsPage() {
  return (
    <SuperAdminGuard>
      <SevenStepsView />
    </SuperAdminGuard>
  );
}
