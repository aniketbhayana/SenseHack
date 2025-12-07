import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, AlertTriangle, BarChart3 } from 'lucide-react';

export default function Layout({ children }) {
    const navItems = [
        { to: "/", icon: <Map size={20} />, label: "Map" },
        { to: "/report", icon: <AlertTriangle size={20} />, label: "Report" },
        { to: "/dashboard", icon: <BarChart3 size={20} />, label: "Dashboard" },
    ];

    return (
        <div className="flex flex-col h-screen w-screen bg-slate-50">
            {/* Top Navigation Bar */}
            <header className="h-16 bg-[#005B65] text-white flex items-center justify-between px-4 md:px-8 shadow-xl z-20 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <img src="/logo.svg" alt="SafeRoute Logo" className="w-7 h-7" />
                    <span className="font-bold text-lg tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>SafeRoute</span>
                </div>

                <nav className="flex items-center gap-1 md:gap-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                                    ? "bg-[#B4D9DD] text-[#005B65] shadow-md font-semibold font-sans"
                                    : "text-[#B4D9DD]/80 hover:bg-[#90CB99]/20 hover:text-white"
                                }`
                            }
                        >
                            <div className={`${({ isActive }) => isActive ? "text-[#005B65]" : "text-current"}`}>
                                {item.icon}
                            </div>
                            <span className="hidden md:block text-sm tracking-wide">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden md:block text-xs text-[#B4D9DD]/60 font-medium">
                    v1.0.0
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden flex flex-col">
                {children}
            </main>
        </div>
    );
}
