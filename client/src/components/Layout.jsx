import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, AlertTriangle, BarChart3, Shield } from 'lucide-react';

export default function Layout({ children }) {
    const navItems = [
        { to: "/", icon: <Map size={20} />, label: "Map" },
        { to: "/report", icon: <AlertTriangle size={20} />, label: "Report" },
        { to: "/dashboard", icon: <BarChart3 size={20} />, label: "Dashboard" },
    ];

    return (
        <div className="flex h-screen w-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-16 md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300">
                <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-700">
                    <Shield className="text-blue-400" size={28} />
                    <span className="ml-3 font-bold text-lg hidden md:block">SafeRoute</span>
                </div>

                <nav className="flex-1 py-6 flex flex-col gap-2 px-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`
                            }
                        >
                            {item.icon}
                            <span className="hidden md:block font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center md:text-left">
                    <span className="hidden md:block">v1.0.0 Alpha</span>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden flex flex-col">
                {children}
            </main>
        </div>
    );
}
