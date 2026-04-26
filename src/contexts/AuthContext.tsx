import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/instant';

interface UserRole {
  id: string;
  email: string;
  role: string;
  department: string | null | undefined;
  is_active: boolean;
  email_verified: boolean;
}

interface AuthContextType {
  user: any;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = db.useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Query user role when user changes
  const { data: roleData, isLoading: isLoadingRole } = db.useQuery(
    user?.email ? {
      user_roles: {
        $: {
          where: {
            email: user.email,
            is_active: true
          }
        }
      }
    } : null
  );

  useEffect(() => {
    if (!isLoadingRole && roleData?.user_roles) {
      const rawRole = (roleData as any).user_roles[0];
      if (rawRole) {
        setUserRole({
          id: rawRole.id,
          email: rawRole.email,
          role: rawRole.role,
          department: rawRole.department ?? null,
          is_active: rawRole.is_active,
          email_verified: rawRole.email_verified
        });
      } else {
        setUserRole(null);
      }
      setLoadingRole(false);
    } else if (!user) {
      setUserRole(null);
      setLoadingRole(false);
    }
  }, [roleData, isLoadingRole, user]);

  const signIn = async (email: string) => {
    await db.auth.sendMagicCode({ email });
  };

  const verifyCode = async (email: string, code: string) => {
    await db.auth.signInWithMagicCode({ email, code });
  };

  const signOut = async () => {
    await db.auth.signOut();
  };

  const isAdmin = userRole?.role === 'admin';
  const isStaff = userRole !== null && (userRole.role === 'admin' || userRole.email_verified === true);

  const loading = isLoading || loadingRole;

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        signIn,
        verifyCode,
        signOut,
        isAdmin,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
