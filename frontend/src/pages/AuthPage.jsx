import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./AuthPage.module.css";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.logo}>EtGPT</h1>
        <p className={styles.subtitle}>
          {mode === "login" ? "Sign in to continue" : "Create your account"}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        {mode === "register" && (
          <input
            className={styles.input}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
        </button>

        <p className={styles.switch}>
          {mode === "login" ? (
            <>
              No account?{" "}
              <button type="button" onClick={() => setMode("register")}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{" "}
              <button type="button" onClick={() => setMode("login")}>
                Sign in
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
