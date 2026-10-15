import { Presentation } from "lucide-react";
import DemoLog from "./DemoLog";
import InitiativeSubPage from "./InitiativeSubPage";

export default function InitiativeDemos() {
  return (
    <InitiativeSubPage
      title="Demos"
      path="demos"
      icon={Presentation}
      description="Every demo given at this event, what came of it, and what each one cost."
    >
      {(initiative) => <DemoLog initiative={initiative} />}
    </InitiativeSubPage>
  );
}
