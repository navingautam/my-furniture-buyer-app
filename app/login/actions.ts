"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export type AuthState = { error: string | null };

export async function authenticate(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const mode = formData.get("mode");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (mode === "signup") {
    const existing = db
      .prepare("select id from profiles where email = ?")
      .get(email);
    if (existing) {
      return { error: "An account with that email already exists." };
    }

    const id = randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare(
      "insert into profiles (id, email, password_hash) values (?, ?, ?)"
    ).run(id, email, passwordHash);

    const session = await getSession();
    session.userId = id;
    session.email = email;
    await session.save();
    redirect("/");
  }

  const user = db
    .prepare("select id, email, password_hash from profiles where email = ?")
    .get(email) as
    | { id: string; email: string; password_hash: string }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return { error: "Incorrect email or password." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();
  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
