import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import App from "./App";

export default function AuthGate() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);

        if (event === "PASSWORD_RECOVERY") {
          setMode("update-password");
          setMessage("Choose your new password.");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const run = async (action) => {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await action();
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const login = () => run(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
  });

  const signup = () => run(async () => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });
    if (error) throw error;

    if (!data.session) {
      setMessage("Account created. Check your email to confirm your account, then log in.");
    } else {
      setMessage("Account created successfully.");
    }
  });

  const reset = () => run(async () => {
    if (!email.trim()) throw new Error("Enter your email address first.");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin }
    );

    if (error) throw error;
    setMessage("Password reset link sent. Check your email.");
  });

  const updatePassword = () => run(async () => {
    if (newPassword.length < 8) {
      throw new Error("Use at least 8 characters for your new password.");
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    setMessage("Password updated successfully.");
    setMode("login");
    setPassword("");
    setNewPassword("");
  });

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div style={styles.loading}>INDUNEX · Loading workspace...</div>;
  }

  if (session) {
    return (
      <div>
        <div style={styles.sessionBar}>
          <span>Signed in as <b>{session.user.email}</b></span>
          <button style={styles.logout} onClick={logout}>Sign out</button>
        </div>
        <App />
      </div>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <div style={styles.brand}>INDUNEX<span>.</span></div>
        <div style={styles.kicker}>INDUSTRIAL INTELLIGENCE PLATFORM</div>

        <h1 style={styles.heading}>
          {mode === "signup" ? "Create your account" :
           mode === "reset" ? "Reset your password" :
           mode === "update-password" ? "Choose a new password" :
           "Welcome back"}
        </h1>

        <p style={styles.subtitle}>
          {mode === "signup" ? "Create an account to access your factory workspace." :
           mode === "reset" ? "We'll send a password reset link to your email." :
           mode === "update-password" ? "Set a new password for your account." :
           "Sign in to continue to your command centre."}
        </p>

        {mode !== "update-password" && (
          <label style={styles.label}>
            EMAIL ADDRESS
            <input
              style={styles.input}
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
        )}

        {(mode === "login" || mode === "signup") && (
          <label style={styles.label}>
            PASSWORD
            <input
              style={styles.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        )}

        {mode === "update-password" && (
          <label style={styles.label}>
            NEW PASSWORD
            <input
              style={styles.input}
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}

        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.success}>{message}</div>}

        <button
          style={styles.primary}
          disabled={busy}
          onClick={
            mode === "signup" ? signup :
            mode === "reset" ? reset :
            mode === "update-password" ? updatePassword : login
          }
        >
          {busy ? "Please wait..." :
           mode === "signup" ? "Create account" :
           mode === "reset" ? "Send reset link" :
           mode === "update-password" ? "Update password" : "Sign in"}
        </button>

        <div style={styles.links}>
          {mode === "login" && <>
            <button onClick={() => {setMode("reset");setError("");setMessage("");}}>Forgot password?</button>
            <button onClick={() => {setMode("signup");setError("");setMessage("");}}>Create account</button>
          </>}

          {mode !== "login" && (
            <button onClick={() => {setMode("login");setError("");setMessage("");}}>
              Back to sign in
            </button>
          )}
        </div>

        <div style={styles.footer}>SECURE WORKSPACE · SUPABASE AUTHENTICATION</div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh", display: "grid", placeItems: "center",
    padding: 20, background: "#090a0c", color: "#f4f4f5",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  panel: {
    width: "100%", maxWidth: 440, boxSizing: "border-box",
    padding: "42px 36px", background: "#111316",
    border: "1px solid #292b30", borderRadius: 12
  },
  brand: { fontSize: 28, fontWeight: 900, letterSpacing: "-1.5px" },
  kicker: { color: "#d34b4b", fontSize: 10, letterSpacing: 2, marginTop: 8 },
  heading: { fontSize: 28, margin: "34px 0 8px", letterSpacing: "-1px" },
  subtitle: { color: "#92949b", fontSize: 13, lineHeight: 1.6, marginBottom: 28 },
  label: { display: "block", fontSize: 10, letterSpacing: 1.2, color: "#b7b8bd", marginTop: 18 },
  input: {
    display: "block", boxSizing: "border-box", width: "100%",
    marginTop: 9, padding: "14px 13px", borderRadius: 6,
    border: "1px solid #35383e", background: "#090a0c",
    color: "#fff", fontSize: 14, outlineColor: "#d34b4b"
  },
  primary: {
    width: "100%", marginTop: 26, padding: 15, border: 0,
    borderRadius: 6, background: "#bd3038", color: "#fff",
    fontWeight: 700, cursor: "pointer"
  },
  links: {
    display: "flex", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12, marginTop: 20
  },
  error: { color: "#ff8585", fontSize: 12, marginTop: 15 },
  success: { color: "#83d6a0", fontSize: 12, marginTop: 15 },
  footer: {
    borderTop: "1px solid #292b30", marginTop: 32, paddingTop: 18,
    color: "#666970", fontSize: 9, letterSpacing: 1.2
  },
  loading: {
    minHeight: "100vh", display: "grid", placeItems: "center",
    background: "#090a0c", color: "#fff", fontFamily: "system-ui"
  },
  sessionBar: {
    minHeight: 38, padding: "6px 18px", boxSizing: "border-box",
    display: "flex", justifyContent: "flex-end", alignItems: "center",
    gap: 16, background: "#090a0c", color: "#bbb",
    fontSize: 11, borderBottom: "1px solid #292b30"
  },
  logout: {
    border: "1px solid #555", background: "transparent",
    color: "#fff", padding: "6px 12px", borderRadius: 4, cursor: "pointer"
  }
};
