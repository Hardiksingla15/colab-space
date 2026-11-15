
import { useState } from "react";
import { Share2, Eye, EyeOff } from "lucide-react";
import "./auth.css";

type AuthProps = {
  onLogin: (token: string, user: { name: string; email: string }) => void;
};

const API_URL = "http://localhost:5000/api/auth";
export default function Auth({ onLogin }: AuthProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/${isSignup ? "signup" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isSignup ? { name, email, password } : { email, password }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (isSignup) {
        setIsSignup(false);
        setPassword("");
        setError("");
        alert("Account created successfully. Please log in.");
        return;
      }

      onLogin(data.token, data.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the server. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="auth-brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="auth-brand-icon">
            <Share2 size={22} />
          </span>
          <span>
            Collab<span>Space</span>
          </span>
        </a>

        <p className="auth-eyebrow">YOUR CREATIVE WORKSPACE</p>

        <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>

        <p className="auth-subtitle">
          {isSignup
            ? "Start bringing your ideas and team together."
            : "Log in to continue to your workspace."}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                minLength={2}
                maxLength={60}
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <span className="auth-password">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to CollabSpace?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignup((current) => !current);
              setError("");
              setPassword("");
            }}
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </p>
      </section>
    </main>
  );
}
