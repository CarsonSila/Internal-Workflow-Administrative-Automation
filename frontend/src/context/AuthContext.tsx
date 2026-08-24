import { createContext, useContext, useEffect, useState } from "react";

export interface UserProfile { username: string; full_name: string; role: "admin" | "manager"; program_access: string[]; }
interface AuthContextValue { user: UserProfile | null; token: string | null; login: (token: string, profile: UserProfile) => void; logout: () => void; loading: boolean; }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const savedToken = localStorage.getItem("inuka_token"); const savedUser = localStorage.getItem("inuka_user"); if (savedToken && savedUser) { try { setToken(savedToken); setUser(JSON.parse(savedUser)); } catch { localStorage.removeItem("inuka_token"); localStorage.removeItem("inuka_user"); } } setLoading(false); }, []);
  const login = (newToken: string, profile: UserProfile) => { setToken(newToken); setUser(profile); localStorage.setItem("inuka_token", newToken); localStorage.setItem("inuka_user", JSON.stringify(profile)); };
  const logout = () => { setToken(null); setUser(null); localStorage.removeItem("inuka_token"); localStorage.removeItem("inuka_user"); };
  return <AuthContext.Provider value={{ user, token, login, logout, loading }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used within AuthProvider"); return context; }
