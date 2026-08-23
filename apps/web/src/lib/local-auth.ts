export interface LocalUser {
  id: string;
  email: string;
  name: string;
  user_metadata?: { name?: string };
  created_at?: string;
}

interface StoredAccount extends LocalUser {
  salt: string;
  passwordHash: string;
}

const ACCOUNTS_KEY = "prashna-accounts";
const SESSION_KEY = "prashna-session";

function randomHex(bytes = 16) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string) {
  const input = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function readAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as StoredAccount[];
  } catch {
    return [];
  }
}

async function ensureDemoAccount() {
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === "demo@prashna.clo")) return accounts;
  const salt = randomHex();
  const demo: StoredAccount = {
    id: "demo-user",
    email: "demo@prashna.clo",
    name: "Demo Shopper",
    salt,
    passwordHash: await hashPassword("Demo@123", salt),
  };
  const updated = [demo, ...accounts];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
  return updated;
}

export function getLocalSession(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as LocalUser | null;
  } catch {
    return null;
  }
}

export async function localSignIn(email: string, password: string) {
  const accounts = await ensureDemoAccount();
  const account = accounts.find((item) => item.email === email.trim().toLowerCase());
  if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
    throw new Error("Invalid email or password.");
  }
  const user: LocalUser = { id: account.id, email: account.email, name: account.name, user_metadata: { name: account.name } };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function localSignUp(name: string, email: string, password: string) {
  const accounts = await ensureDemoAccount();
  const normalizedEmail = email.trim().toLowerCase();
  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }
  const salt = randomHex();
  const account: StoredAccount = {
    id: `user-${Date.now()}`,
    email: normalizedEmail,
    name: name.trim(),
    salt,
    passwordHash: await hashPassword(password, salt),
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  const user: LocalUser = { id: account.id, email: account.email, name: account.name, user_metadata: { name: account.name } };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function localSignOut() {
  localStorage.removeItem(SESSION_KEY);
}
