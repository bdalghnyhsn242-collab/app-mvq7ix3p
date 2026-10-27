import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import { AUTH_ENABLED } from "@/config/features";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useUserSettings } from "@/context/UserSettingsContext";

export default function SettingsPage() {
  const { session } = useAuth();
  const { theme, setTheme } = useTheme();
  const { getSetting, updateSetting, isLoading, error } = useUserSettings();
  const [displayName, setDisplayName] = useState(session.user?.full_name ?? "");

  useEffect(() => {
    const storedTheme = getSetting("preferences", "theme");
    if (typeof storedTheme === "string" && storedTheme !== theme) {
      setTheme(storedTheme);
    }
  }, [getSetting, setTheme, theme]);

  async function handleThemeChange(value: string) {
    setTheme(value);
    const saved = await updateSetting("preferences", "theme", value);
    if (saved) toast.success("Theme preference saved");
  }

  async function handleSaveProfile() {
    const saved = await updateSetting("profile", "display_name", displayName);
    if (saved) toast.success("Profile setting saved");
  }

  return (
    <AppLayout>
      <div className="page-shell max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Generic account and app preferences
            {AUTH_ENABLED ? " backed by the user_settings table." : " stored locally while auth is disabled."}
          </p>
        </div>

        {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Profile</CardTitle>
            <CardDescription>Keep app-level profile settings here or replace with your product settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={session.user?.email ?? ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </div>
            <div className="grid max-w-xs gap-2">
              <Label>Theme</Label>
              <Select value={theme ?? "system"} onValueChange={handleThemeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveProfile} disabled={isLoading}>
              Save settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
