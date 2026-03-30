import { Pipeline } from "@/components/pipeline";

export default function Home() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Workflow Pipeline</h2>
        <span className="font-mono text-xs text-muted-foreground">
          polling every 3s
        </span>
      </div>
      <Pipeline />
    </div>
  );
}
