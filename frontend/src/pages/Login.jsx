import React, { useState } from "react";
import { loginUser } from "../services/api";

function Login({ role, onBack, onCreateAccount, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roleName = role === "teacher" ? "Teacher" : "Student";
  const roleIcon = role === "teacher" ? "👨‍🏫" : "👨‍🎓";

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const data = await loginUser(
        email,
        password
      );

      onLogin(data);

    } catch (error) {
      setError(
        error.message || "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">

        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <div className="auth-brand">
          <div className="brand-mark small">
            EB
          </div>

          <span>EchoBridge</span>
        </div>

        <div className="auth-card">

          <div className="auth-icon">
            {roleIcon}
          </div>

          <p className="auth-label">
            {roleName.toUpperCase()} PORTAL
          </p>

          <h1>Welcome back</h1>

          <p className="auth-subtitle">
            Sign in to continue to your
            EchoBridge dashboard.
          </p>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <label>
              Email address
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              disabled={loading}
            />

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              disabled={loading}
            />

            <button
              className="primary-auth-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign In →"}
            </button>

          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <p className="create-text">
            Don't have an account?

            <button
              className="link-button"
              onClick={onCreateAccount}
              disabled={loading}
            >
              Create account
            </button>
          </p>

        </div>

        <p className="secure-text">
          🔒 Your account is securely stored
        </p>

      </div>
    </div>
  );
}

export default Login;
