import { useState } from "react";

export default function AuthPage({
  onAuth,
}: {
  onAuth: (user: any, provider: any) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await window.api.login(email, password);
        if (res.success) onAuth(res.user, res.provider);
        else setError(res.error);
      } else {
        if (!name) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        const res = await window.api.register(name, email, password);
        if (res.success) onAuth(res.user, null);
        else setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-left">
        <div className="auth-grid" />
        <div className="auth-brand">
          <div className="auth-logo">
            <span className="logo-g">Z</span>AN
          </div>
          <p className="auth-tagline">
            Rent your GPU.
            <br />
            <em>Earn while you sleep.</em>
          </p>
        </div>
        <div className="auth-stats">
          <div className="auth-stat">
            <span className="auth-stat-n">2,481</span>
            <span className="auth-stat-l">Active GPUs</span>
          </div>
          <div className="auth-stat">
            <span className="auth-stat-n">94.2K</span>
            <span className="auth-stat-l">Jobs Done</span>
          </div>
          <div className="auth-stat">
            <span className="auth-stat-n">99.1%</span>
            <span className="auth-stat-l">Uptime</span>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-head">
            <h2>{mode === "login" ? "Welcome back" : "Join the network"}</h2>
            <p>
              {mode === "login"
                ? "Sign in to your provider account"
                : "Create your provider account"}
            </p>
          </div>

          <div className="auth-form">
            {mode === "register" && (
              <div className="field">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            {error && <div className="err">{error}</div>}

            <button
              className="btn-primary btn-full"
              onClick={submit}
              disabled={loading}
            >
              {loading ? (
                <span className="spin" />
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </div>

          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
