import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import MapView from '../MapView';

export default function ReportPage() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        location: null, // { lat, lng }
        category: '',
        severity: 3,
        description: ''
    });

    useEffect(() => {
        api.getCategories().then(setCategories);
    }, []);

    const handleLocationPick = (loc) => {
        setFormData(prev => ({ ...prev, location: loc }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.location || !formData.category) return alert("Please select a location and category.");

        setLoading(true);
        await api.submitReport({
            location: formData.location,
            category: formData.category,
            severity: formData.severity,
            description: formData.description
        });
        setLoading(false);

        alert("Report submitted successfully!");
        navigate('/');
    };

    return (
        <div className="flex h-full flex-col md:flex-row">
            {/* Form Section */}
            <div className="w-full md:w-1/3 p-6 bg-white overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-slate-800">Report Incident</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">1. Pick Location on Map</label>
                        <div className={`p-3 rounded border text-sm ${formData.location ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            {formData.location
                                ? `Selected: ${formData.location.lat.toFixed(4)}, ${formData.location.lng.toFixed(4)}`
                                : 'Click on the map to select location...'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">2. Category</label>
                        <select
                            required
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">3. Severity (1-5)</label>
                        <input
                            type="range" min="1" max="5"
                            className="w-full"
                            value={formData.severity}
                            onChange={e => setFormData({ ...formData, severity: parseInt(e.target.value) })}
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Minor</span><span>Critical</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">4. Description</label>
                        <textarea
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none h-24"
                            placeholder="Describe the issue..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                </form>
            </div>

            {/* Map Picker Section */}
            <div className="flex-1 h-64 md:h-full border-l border-slate-200">
                <MapView
                    initialZoom={14}
                    showHeatmap={false}
                    onReportPick={handleLocationPick}
                />
            </div>
        </div>
    );
}
