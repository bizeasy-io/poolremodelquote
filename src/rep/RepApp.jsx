import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Screen, BrandBar, ORANGE } from "./ui";
import DayView from "./DayView";
import LeadDetail from "./LeadDetail";
import AppointmentDetail from "./AppointmentDetail";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError("Couldn't sign in. Check email and password.");
    setBusy(false);
  }

  return (
    <Screen>
      <BrandBar />
      <div className="bg-white rounded-xl p-5 mt-8">
        <div className="text-xl font-medium text-black mb-4">Tech sign in</div>
        <form onSubmit={signIn}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm text-black mb-2.5"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm text-black mb-3"
          />
          {error && (
            <div className="text-sm text-red-600 mb-3">{error}</div>
          )}
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full rounded-xl py-3 text-white font-medium disabled:opacity-50"
            style={{ background: ORANGE }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </Screen>
  );
}

export default function RepApp() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <Screen>{null}</Screen>;
  }
  if (!session) {
    return <Login />;
  }

  return (
    <Routes>
      <Route index element={<DayView />} />
      <Route path="lead/:id" element={<LeadDetail />} />
      <Route path="appointment/:id" element={<AppointmentDetail />} />
    </Routes>
  );
}
