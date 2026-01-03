import { db, FieldValue } from "./firebaseAdmin";

type SeedUser = {
  username: string;
  initialPassword: string;
  role: "admin" | "employee";
};

export const SEED_USERS: SeedUser[] = [
  { username: "Vaughn", initialPassword: "0996", role: "admin" },
  { username: "Kaina", initialPassword: "2846", role: "admin" },
  { username: "Mac", initialPassword: "0143", role: "admin" },
  { username: "Blake", initialPassword: "8746", role: "employee" },
  { username: "Hajime", initialPassword: "8851", role: "employee" },
  { username: "Collin", initialPassword: "3858", role: "employee" },
  { username: "Preston", initialPassword: "5302", role: "employee" },
  { username: "Kip", initialPassword: "7182", role: "employee" },
  { username: "Jack", initialPassword: "1267", role: "employee" }
];

export async function seedUsersIfEmpty() {
  const usersRef = db().collection("users");
  const snap = await usersRef.limit(1).get();
  if (!snap.empty) return;

  for (const u of SEED_USERS) {
    const usernameLower = u.username.toLowerCase();
    await usersRef.add({
      username: u.username,
      usernameLower,
      password: u.initialPassword,          // plain text, because you asked
      mustChangePassword: true,
      role: u.role,
      createdAt: FieldValue.serverTimestamp()
    });
  }
}

