import { PageHeader } from "@/components/ui/page-header";
import { CodeIcon } from "@radix-ui/react-icons";
import { TestConsole } from "./test-console";

export default function TestPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Test console"
        description="Send a real tool call straight to your Intentos API and see the live verdict — the same request any connected agent sends before every action."
        icon={CodeIcon}
        iconColor="#EE9A5C"
      />
      <TestConsole />
    </div>
  );
}
