import { useState, useEffect } from "react";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import OnboardPage from "./pages/OnboardPage";
import "./styles.css";

type Page = "auth" | "dashboard" | "onboard";

export default function App() {
  const [page, setPage] = useState<Page>("auth");
  const [user, setUser] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    window.api.getSession().then((s: any) => {
      if (s.user) {
        setUser(s.user);
        setProvider(s.provider);
        setPage("dashboard");
      }
      setBooting(false);
    });
  }, []);

  if (booting) {
    return (
      <div className="splash">
        <div className="splash-logo">
          <span className="logo-g">G</span>NET
        </div>
        <div className="splash-bar" />
      </div>
    );
  }

  if (page === "auth") {
    return (
      <AuthPage
        onAuth={(u, p) => {
          setUser(u);
          setProvider(p);
          setPage("dashboard");
        }}
      />
    );
  }

  if (page === "onboard") {
    return (
      <OnboardPage
        onComplete={(p) => {
          setProvider(p);
          setPage("dashboard");
        }}
        onBack={() => setPage("dashboard")}
      />
    );
  }

  return (
    <DashboardPage
      user={user}
      provider={provider}
      onAddMachine={() => setPage("onboard")}
      onProviderUpdate={setProvider}
      onLogout={() => {
        setUser(null);
        setProvider(null);
        setPage("auth");
      }}
      onUserUpdate={setUser}
    />
  );
}
