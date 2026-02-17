import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function App() {
  const [status, setStatus] = useState("Testing...");

  useEffect(() => {
    (async () => {
      // This checks if Supabase API is reachable and key is valid
      const { error } = await supabase.auth.getSession();

      if (error) setStatus("❌ Not connected: " + error.message);
      else setStatus("✅ Connected to Supabase!");
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Supabase Connection Test</h1>
      <p>{status}</p>
    </div>
  );
}

