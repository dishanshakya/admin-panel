"use client";
import { useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AdminNav } from "../organisms/AdminNav.jsx";
import { Logo } from "../organisms/AdminNavLogo.jsx";
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useApi } from '../../contexts/ApiContext.jsx'
import Breadcrumb from "../molecules/Breadcrumb.jsx";
import { useRouter } from 'next/navigation'
import { getEntities } from "../../lib/runtime.config.js";

export function AdminShell({ children }) {
  const [panel, setPanel] = useState(true);
  const { user } = useAuth();
  const { post } = useApi();
  const router = useRouter();

  const handleLogout = async () => {
    const res = await post('/api/users/logout');
    if (res.ok) router.push('/login');
  };

  // Dynamically filter entities based on the user's role and the entity's roles array
  const entities = getEntities()
  const visibleEntities = Object.fromEntries(
    Object.entries(entities).filter(([_, entity]) => {
      return entity.roles?.includes(user?.role);
    })
  );

  return (
    <div className="flex h-screen bg-black-500">
      <div
        className={`relative flex flex-col gap-1 border-r border-gray-200 bg-gray-50 p-3 transition-all duration-200 ${
          panel ? "w-[220px]" : "w-[72px]"
        }`}
      >
        <button
          type="button"
          onClick={() => setPanel((prev) => !prev)}
          title={panel ? "Collapse sidebar" : "Expand sidebar"}
          className="absolute top-8 -right-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:text-gray-900 focus:outline-none"
        >
          {panel ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <div className="px-1 py-2">
          <Logo panel={panel} />
        </div>

        <div className="mt-2 h-px bg-gray-200" />

        <div className="mt-2 flex-1 overflow-y-auto">
          {/* Pass the filtered entities */}
          <AdminNav items={visibleEntities} panel={panel} />
        </div>
      </div>

      <div className="flex flex-1 p-4 gap-4 flex-col overflow-y-auto">
        <div className='flex justify-between w-full'>
          <Breadcrumb />
          <div className='flex gap-md items-center'>
            <span className='rounded-md p-1 bg-gray-500 text-white text-xs'>{user?.role}</span>
            <button className='wrapper-btn' title='Logout' onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 ">{children}</div>
      </div>
    </div>
  );
}
