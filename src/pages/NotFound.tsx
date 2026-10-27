import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No route is registered for `{location.pathname}`.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
