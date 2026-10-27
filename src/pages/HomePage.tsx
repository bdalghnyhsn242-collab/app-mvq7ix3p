import AppLayout from "@/components/layout/AppLayout";

export default function HomePage() {
  return (
    <AppLayout>
      <div className="page-shell space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Root route</p>
        <h1 className="text-3xl font-semibold">App Base</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Build the app’s primary experience here at <span className="font-mono text-foreground">/</span> by editing{" "}
          <span className="font-mono text-foreground">src/pages/HomePage.tsx</span>.
        </p>
      </div>
    </AppLayout>
  );
}