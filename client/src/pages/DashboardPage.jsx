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
            <h1 className="text-3xl font-bold text-slate-800 mb-8">Safety Dashboard</h1>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><AlertCircle size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold">{stats.totalReports}</div>
                        <div className="text-sm text-slate-500">Total Incidents</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-lg"><BarChart3 size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold">{stats.recentReports}</div>
                        <div className="text-sm text-slate-500">Last 24 Hours</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg"><MapPin size={24} /></div>
                    <div>
                        <div className="text-2xl font-bold">{stats.hotspots.length}</div>
                        <div className="text-sm text-slate-500">Active Hotspots</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold mb-4">Incidents by Category</h3>
                    <div className="space-y-3">
                        {Object.entries(stats.byCategory).map(([cat, count]) => (
                            <div key={cat} className="flex items-center justify-between">
                                <span className="capitalize text-slate-600">{cat}</span>
                                <div className="flex items-center gap-3 flex-1 ml-4">
                                    <div className="h-2 bg-slate-100 flex-1 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / stats.totalReports) * 100}%` }}></div>
                                    </div>
                                    <span className="text-sm font-medium w-6">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hotspots */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold mb-4">Top Risk Zones</h3>
                    <div className="space-y-4">
                        {stats.hotspots.map((h, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="font-medium text-slate-700">{h.name}</div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${h.score > 8 ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                    Risk: {h.score}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
