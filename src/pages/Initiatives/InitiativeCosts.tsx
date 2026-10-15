import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import CostSheet from "./CostSheet";
import { CARD } from "./detailStyles";
import InitiativeSubPage from "./InitiativeSubPage";

export default function InitiativeCosts() {
  return (
    <InitiativeSubPage
      title="Costs"
      path="costs"
      icon={Receipt}
      description="Every cost for this initiative, from estimate to paid, grouped by expense type."
    >
      {(initiative) => (
        <Card className={`${CARD} gap-0 p-5`}>
          <CostSheet initiative={initiative} />
        </Card>
      )}
    </InitiativeSubPage>
  );
}
