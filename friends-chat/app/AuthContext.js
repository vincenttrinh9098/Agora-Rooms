import { createContext, useContext } from 'react';

// The Context object itself — just a channel, holds no data on its own.
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;