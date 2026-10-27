import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeBootstrapper } from "@/components/ThemeBootstrapper";
import { AUTH_ENABLED } from "@/config/features";
import { AuthProvider } from "@/context/AuthContext";
import { TriggerProvider } from "@/context/TriggerContext";
import { UserSettingsProvider } from "@/context/UserSettingsContext";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import NotFound from "@/pages/NotFound";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SettingsPage from "@/pages/SettingsPage";
import "@/App.css";

function App() {
  return (
    <AuthProvider>
      <UserSettingsProvider>
        <TriggerProvider>
          <ThemeBootstrapper />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/auth"
              element={AUTH_ENABLED ? <AuthPage /> : <Navigate to="/" replace />}
            />
            <Route
              path="/reset-password"
              element={AUTH_ENABLED ? <ResetPasswordPage /> : <Navigate to="/" replace />}
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TriggerProvider>
      </UserSettingsProvider>
    </AuthProvider>
  );
}

export default App;
