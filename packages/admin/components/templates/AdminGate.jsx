'use client'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getEntities } from '../../lib/runtime.config.js'

export function AdminGate({ children }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const entities = getEntities()
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean); // ['admin', 'users', '123', 'edit']
  const section = segments[1]; // 'users', 'posts', undefined for bare /admin
  const currentPath = section ? `/admin/${section}` : "/admin/dashboard";

  const matched = section
    ? Object.values(entities).find((entity) => entity.route === currentPath)
    : null;

  const allowed = matched?.roles ? matched.roles.includes(user?.role) : true;

  useEffect(() => {
    if (isLoading || !user) return;
    if (!allowed) {
      router.replace("/admin/dashboard");
    }
  }, [isLoading, user, allowed, router]);

  if (isLoading || !user || !allowed) return null;

  return children;
}
