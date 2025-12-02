import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedRole = searchParams.get("role") || "";

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        // Check if profile doesn't exist
        if (profileError.code === "PGRST116" || profileError.message?.includes("No rows")) {
          setError(
            "Profile not found. Please create a profile for this user. " +
            "Check TEST_USERS_SETUP.md for instructions."
          );
        } else if (profileError.code === "42501" || profileError.message?.includes("permission denied")) {
          setError(
            "Permission denied. Please check RLS policies. " +
            "Make sure you have the 'Users can view their own profile' policy set up."
          );
        } else {
          setError(`Failed to fetch user profile: ${profileError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!profile) {
        setError("Profile not found. Please create a profile for this user.");
        setLoading(false);
        return;
      }

      // Verify role matches if one was selected
      if (selectedRole && profile?.role !== selectedRole) {
        setError(`This account is registered as ${profile?.role}, not ${selectedRole}`);
        setLoading(false);
        return;
      }

      // Navigate based on role
      if (profile?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/intern");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Login</h1>
        <p className="auth-subtitle">
          {selectedRole 
            ? `Sign in as ${selectedRole === "admin" ? "Admin" : "Intern"}`
            : "Sign in to your account"
          }
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="form-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-link" style={{ marginTop: "0.5rem" }}>
          <Link to="/">← Back to role selection</Link>
        </div>
      </div>
    </div>
  );
}
