import { useContext } from "react";

import {
  AuthSessionContext,
  createAuthSessionFallback,
} from "../context/AuthSessionProvider";

export function useAuthSession() {
  return useContext(AuthSessionContext) || createAuthSessionFallback();
}
