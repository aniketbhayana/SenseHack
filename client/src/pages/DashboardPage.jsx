import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BarChart3, AlertCircle, MapPin } from 'lucide-react';

export default function DashboardPage() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        api.getStats().then(setStats);
    }, []);

    if (!stats) return <div className="p-8 text-slate-500">Loading stats...</div>;

    return (
        <div className="p-6 md:p-8 overflow-y-auto">
            <h1 className="text-3xl font-bold text-[#005B65] mb-8">Safety Dashboard</h1>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#B4D9DD]/30 flex items-center gap-4">
                    <div className="p-3 bg-[#B4D9DD] text-[#005B65] rounded-lg"><AlertCircle size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold text-[#005B65]">{stats.totalReports}</div>
                        <div className="text-sm text-[#005922]/80">Total Incidents</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#B4D9DD]/30 flex items-center gap-4">
                    <div className="p-3 bg-[#90CB99] text-[#005922] rounded-lg"><BarChart3 size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold text-[#005B65]">{stats.recentReports}</div>
                        <div className="text-sm text-[#005922]/80">Last 24 Hours</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#B4D9DD]/30 flex items-center gap-4">
                    <div className="p-3 bg-[#005B65] text-white rounded-lg"><MapPin size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold text-[#005B65]">{stats.hotspots.length}</div>
                        <div className="text-sm text-[#005922]/80">Active Hotspots</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#B4D9DD]/30">
                    <h3 className="text-lg font-semibold mb-4 text-[#005B65]">Incidents by Category</h3>
                    <div className="space-y-3">
                        {Object.entries(stats.byCategory).map(([cat, count]) => (
                            <div key={cat} className="flex items-center justify-between">
                                <span className="capitalize text-[#005922]">{cat}</span>
                                <div className="flex items-center gap-3 flex-1 ml-4">
                                    <div className="h-2 bg-[#B4D9DD]/30 flex-1 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#005B65] rounded-full" style={{ width: `${(count / stats.totalReports) * 100}%` }}></div>
                                    </div>
                                    <span className="text-sm font-medium w-6 text-[#005B65]">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hotspots */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#B4D9DD]/30">
                    <h3 className="text-lg font-semibold mb-4 text-[#005B65]">Top Risk Zones</h3>
                    <div className="space-y-4">
                        {stats.hotspots.map((h, i) => (
                            <div key={i} className="p-4 bg-[#F0F7F8] rounded-lg border border-[#B4D9DD]/50 transition-colors hover:bg-[#B4D9DD]/20">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="font-semibold text-[#005B65]">{h.name}</div>
                                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${h.score > 7 ? 'bg-[#005922] text-white' : h.score > 4 ? 'bg-[#005B65] text-white' : 'bg-[#90CB99] text-[#005922]'}`}>
                                        Risk Score: {h.score}/10
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[#005922]/70 uppercase tracking-wider font-semibold">Crime Rate</span>
                                        <span className="font-medium text-[#005B65]">{h.crimeRate}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[#005922]/70 uppercase tracking-wider font-semibold">Recent Incidents</span>
                                        <span className="font-medium text-[#005B65]">{h.recentReports}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
