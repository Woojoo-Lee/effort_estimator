import { supabase } from "../../../services/supabaseClient";

function getAuthClient(client = supabase) {
  if (!client?.auth) {
    throw new Error("Supabase Auth client is not configured.");
  }

  return client;
}

export function getAuthSession(client) {
  return getAuthClient(client).auth.getSession();
}

export function getCurrentAuthUser(client) {
  return getAuthClient(client).auth.getUser();
}

export function signInWithPassword({ email, password }, client) {
  return getAuthClient(client).auth.signInWithPassword({
    email,
    password,
  });
}

export function signOut(client) {
  return getAuthClient(client).auth.signOut();
}

export function onAuthStateChange(callback, client) {
  return getAuthClient(client).auth.onAuthStateChange((event, session) => {
    callback({
      event,
      session,
      user: session?.user || null,
    });
  });
}

export const authSessionRepository = {
  getAuthSession,
  getCurrentAuthUser,
  signInWithPassword,
  signOut,
  onAuthStateChange,
};
