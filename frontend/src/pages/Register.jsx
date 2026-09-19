import React, { useState } from "react";
import { registerUser } from "../services/api";

function Register({ role, onBack, onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roleName =
    role === "teacher"
      ? "Teacher"
      : "Student";

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError(
        "Please fill in all fields."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const data = await registerUser(
        name,
        email,
        password,
        role
      );

      onLogin(data);

    } catch (error) {
      setError(
        error.message ||
        "Account creation failed."
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
          disabled={loading}
        >
          ← Back
        </button>

        <div className="auth-brand">
          <div className="brand-mark small">
            EB
          </div>

          <span>EchoBridge</span>
        </div>

        <div className="auth-card register-card">

          <div className="auth-icon">
            {role === "teacher"
              ? "👨‍🏫"
              : "👨‍🎓"}
          </div>

          <p className="auth-label">
            CREATE ACCOUNT
          </p>

          <h1>Join EchoBridge</h1>

          <p className="auth-subtitle">
            Create your{" "}
            {roleName.toLowerCase()} account.
          </p>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <label>
              Full name
            </label>

            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              disabled={loading}
            />

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
              placeholder="Create a password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              disabled={loading}
            />

            <label>
              Confirm password
            </label>

            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              disabled={loading}
            />

            <button
              className="primary-auth-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Create Account →"}
            </button>

          </form>

          <p className="create-text">
            Already have an account?

            <button
              className="link-button"
              onClick={onBack}
              disabled={loading}
            >
              Sign in
            </button>
          </p>

        </div>

      </div>
    </div>
  );
}

export default Register;
