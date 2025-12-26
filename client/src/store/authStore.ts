import type { User } from "@/types/auth.type";
import { atomWithStorage } from "jotai/utils";
import { atom } from "jotai";

export const userAtom = atomWithStorage<User | null>("user", null);
export const isAuthAtom = atomWithStorage<boolean>("isAuth", false);
export const isAdminAtom = atomWithStorage<boolean>("isAdmin", false);
export const tokenExpirationAtom = atomWithStorage<number | null>("tokenExpiration", null);

// Производный атом для получения текущего access token
export const accessTokenAtom = atom<string | null>((get) => {
  const user = get(userAtom);
  return user?.accessToken || null;
});

// Производный атом для проверки, истёк ли access token
export const isTokenExpiredAtom = atom<boolean>((get) => {
  const expiration = get(tokenExpirationAtom);
  if (!expiration) return false;
  return Date.now() > expiration;
});
