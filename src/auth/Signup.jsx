import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import "./Auth.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedRole = searchParams.get("role") || "intern";

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Sign up user with role in metadata
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
          },
        },
      });

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      // Check if user was created
      // Note: If email confirmation is required, data.user might be null
      // but the user is still created in the database
      if (!data.user) {
        // If email confirmation is required, user will be created after confirmation
        // In that case, you might want to use a database trigger to create the profile
        setError("Please check your email to confirm your account. Your profile will be created after confirmation.");
        setLoading(false);
        return;
      }

      // Try to create profile (if trigger doesn't exist, this will create it)
      // If a database trigger is set up, it will create the profile automatically
      // and this insert might fail with "duplicate key" which is fine
      console.log("Attempting to create profile for user:", data.user.id, "with role:", selectedRole);
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          full_name: null,
          role: selectedRole,
          email: data.user.email,
        })
        .select()
        .single();

      if (profileError) {
        // If profile already exists (trigger created it), that's fine - verify it exists
        if (profileError.code === "23505") {
          console.log("Profile already exists (likely created by trigger), verifying...");
          // Check if profile exists and has correct role
          const { data: existingProfile, error: checkError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();
          
          if (checkError) {
            setError(`Profile exists but couldn't verify: ${checkError.message}`);
            setLoading(false);
            return;
          }
          
          // If role doesn't match, update it
          if (existingProfile.role !== selectedRole) {
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ role: selectedRole })
              .eq("id", data.user.id);
            
            if (updateError) {
              setError(`Couldn't update profile role: ${updateError.message}`);
              setLoading(false);
              return;
            }
          }
          
          console.log("Profile verified/updated successfully");
        } else if (profileError.code === "42501" || profileError.message?.includes("permission denied") || profileError.message?.includes("new row violates")) {
          // Permission denied - RLS policy issue
          // Check if trigger created the profile anyway
          console.log("RLS blocked insertion, checking if trigger created profile...");
          const { data: triggerProfile, error: triggerCheckError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();
          
          if (triggerProfile) {
            console.log("Profile was created by trigger:", triggerProfile);
            // Profile exists, continue with success
          } else {
            // No profile exists and RLS is blocking
            setError(
              "Permission denied. Please set up the database trigger as described in SUPABASE_SETUP.md. " +
              "Check the browser console for the SQL to run."
            );
            console.error("=== SETUP REQUIRED ===");
            console.error("Run this SQL in your Supabase SQL Editor:");
            console.error(`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NULL,
    COALESCE(NEW.raw_user_meta_data->>'role', 'intern')
  )
  ON CONFLICT (id) DO UPDATE
  SET role = COALESCE(NEW.raw_user_meta_data->>'role', 'intern');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
            `);
            setLoading(false);
            return;
          }
        } else {
          setError(`Failed to create profile: ${profileError.message} (Code: ${profileError.code})`);
          setLoading(false);
          return;
        }
      } else {
        console.log("Profile created successfully via client:", profileData);
      }
      
      // Verify profile exists before proceeding
      const { data: finalProfile, error: verifyError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      
      if (verifyError || !finalProfile) {
        setError("Account created but profile verification failed. Please try logging in.");
        setLoading(false);
        return;
      }
      
      console.log("Final profile verification:", finalProfile);

      setSuccess(`Account created successfully! You can now sign in as ${selectedRole === "admin" ? "Admin" : "Intern"}.`);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate(`/login?role=${selectedRole}`);
      }, 2000);
    } catch (err) {
      console.error("Signup error:", err);
      setError(`An unexpected error occurred: ${err.message}`);
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">
          Register as {selectedRole === "admin" ? "Admin" : "Intern"}
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSignup} className="auth-form">
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
              placeholder="Enter your password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="form-button" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to={`/login${selectedRole ? `?role=${selectedRole}` : ""}`}>Sign in here</Link>
        </div>

        <div className="auth-link" style={{ marginTop: "0.5rem" }}>
          <Link to="/">← Back to role selection</Link>
        </div>
      </div>
    </div>
  );
}
