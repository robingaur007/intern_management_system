import { Navigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useEffect, useState } from "react";

export default function RequireAuth({ role, children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === role) {
        setAllowed(true);
      }

      setLoading(false);
    }
    check();
  }, [role]);

  if (loading) return <p>loading...</p>;
  if (!allowed) return <Navigate to="/login" />;
  return children;
}