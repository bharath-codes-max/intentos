import { PageHeader } from "@/components/ui/page-header";
import { TestConsole } from "./test-console";

export default function TestPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Test console"
        description="Send a real tool call straight to your Intentos API and see the live verdict — the same request any connected agent sends before every action."
      />
      <TestConsole />
    </div>
  );
}
