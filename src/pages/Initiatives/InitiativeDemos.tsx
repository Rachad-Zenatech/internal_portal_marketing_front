import { Presentation } from "lucide-react";
import DemoLog from "./DemoLog";
import InitiativeSubPage from "./InitiativeSubPage";

export default function InitiativeDemos() {
  return (
    <InitiativeSubPage
      title="Demos"
      path="demos"
      icon={Presentation}
      tone="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
      description="Every demo given at this event, what came of it, and what each one cost."
    >
      {(initiative) => <DemoLog initiative={initiative} />}
    </InitiativeSubPage>
  );
}
