"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, formAction, pending] = useActionState(
    authenticate,
    initialState
  );

  return (
    <div className="px-6 py-12 max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold mb-6">
        {mode === "login" ? "Log in" : "Sign up"}
      </h1>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="mode" value={mode} />
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="bg-black text-white rounded px-3 py-2 mt-2 disabled:opacity-50 cursor-pointer"
        >
          {pending ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      {state.error && (
        <p className="text-sm text-red-600 mt-4">{state.error}</p>
      )}

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="text-sm underline mt-6 cursor-pointer"
      >
        {mode === "login"
          ? "Need an account? Sign up"
          : "Already have an account? Log in"}
      </button>
    </div>
  );
}
