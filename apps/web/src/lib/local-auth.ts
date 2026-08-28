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
  passwordAlgorithm?: "SHA-256" | "PBKDF2-SHA-256";
  passwordIterations?: number;
}

const ACCOUNTS_KEY = "prashna-accounts";
const SESSION_KEY = "prashna-session";
const PASSWORD_ITERATIONS = 120_000;

function randomHex(bytes = 16) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function legacyHashPassword(password: string, salt: string) {
  const input = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const digest = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations,
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, account: StoredAccount) {
  if (account.passwordAlgorithm === "PBKDF2-SHA-256") {
    return (await hashPassword(password, account.salt, account.passwordIterations)) === account.passwordHash;
  }
  return (await legacyHashPassword(password, account.salt)) === account.passwordHash;
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
    passwordAlgorithm: "PBKDF2-SHA-256",
    passwordIterations: PASSWORD_ITERATIONS,
  };
  const updated = [demo, ...accounts];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
  return updated;
}

export function getLocalSession(): LocalUser | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as LocalUser | null;
  } catch {
    return null;
  }
}

export async function localSignIn(email: string, password: string) {
  const accounts = await ensureDemoAccount();
  const account = accounts.find((item) => item.email === email.trim().toLowerCase());
  if (!account || !(await verifyPassword(password, account))) {
    throw new Error("Invalid email or password.");
  }

  if (account.passwordAlgorithm !== "PBKDF2-SHA-256") {
    account.passwordHash = await hashPassword(password, account.salt);
    account.passwordAlgorithm = "PBKDF2-SHA-256";
    account.passwordIterations = PASSWORD_ITERATIONS;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
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
    passwordAlgorithm: "PBKDF2-SHA-256",
    passwordIterations: PASSWORD_ITERATIONS,
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  const user: LocalUser = { id: account.id, email: account.email, name: account.name, user_metadata: { name: account.name } };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function localSignOut() {
  localStorage.removeItem(SESSION_KEY);
}
