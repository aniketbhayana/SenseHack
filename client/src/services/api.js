// src/services/api.js

export const api = {
    // GET /api/reports?bbox=...
    getReports: async (bbox) => {
        const params = new URLSearchParams(bbox ? { bbox } : {});
        const resp = await fetch(`/api/reports?${params}`);
        if (!resp.ok) throw new Error('Failed to fetch reports');
        return resp.json();
    },

    // POST /api/reports
    submitReport: async (reportData) => {
        const resp = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });
        if (!resp.ok) throw new Error('Failed to submit report');
        return resp.json();
    },

    // GET /api/reports/categories
    getCategories: async () => {
        const resp = await fetch('/api/reports/categories');
        if (!resp.ok) throw new Error('Failed to fetch categories');
        return resp.json();
    },

    // POST /api/route
    getRoute: async ({ origin, destination, mode }) => {
        const resp = await fetch('/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin, destination, mode })
        });
        if (!resp.ok) throw new Error('Failed to fetch route');
        return resp.json();
    },

    // GET /api/stats (We will implement this on backend now)
    getStats: async () => {
        const resp = await fetch('/api/reports/stats');
        if (!resp.ok) throw new Error('Failed to fetch stats');
        return resp.json();
    },

    // GET /api/stats/infrastructure/nearby?lat=..&lng=..&radius=..&type=..
    getNearbyInfrastructure: async ({ lat, lng, radius = 3000, type }) => {
        const params = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            radius: String(radius)
        });
        if (type) params.append('type', type);

        const resp = await fetch(`/api/stats/infrastructure/nearby?${params.toString()}`);
        if (!resp.ok) throw new Error('Failed to fetch infrastructure');
        return resp.json();
    }
};
