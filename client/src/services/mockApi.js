// src/services/mockApi.js

// Initial Seed Data
const MOCK_REPORTS = [
    {
        id: "r1",
        location: { lat: 12.9716, lng: 77.5946 },
        category: "pothole",
        severity: 3,
        description: "Deep pothole on main road",
        reportedAt: new Date(Date.now() - 10000000).toISOString(),
        verified: true
    },
    {
        id: "r2",
        location: { lat: 12.9720, lng: 77.5950 },
        category: "accident",
        severity: 5,
        description: "Minor collision",
        reportedAt: new Date(Date.now() - 5000000).toISOString(),
        verified: false
    },
    {
        id: "r3",
        location: { lat: 12.9650, lng: 77.6000 },
        category: "lighting",
        severity: 4,
        description: "Street lights not working",
        reportedAt: new Date().toISOString(),
        verified: true
    }
];

const MOCK_CATEGORIES = [
    { key: "pothole", label: "Pothole" },
    { key: "accident", label: "Accident" },
    { key: "robbery", label: "Robbery" },
    { key: "lighting", label: "Poor Lighting" },
    { key: "harassment", label: "Harassment" }
];

// Helper to simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
    // GET /api/reports
    getReports: async (bbox) => {
        await delay(500); // simulate latency
        // In a real mock, we'd filter by bbox. For now, return all.
        return { data: [...MOCK_REPORTS] };
    },

    // POST /api/reports
    submitReport: async (reportData) => {
        await delay(800);
        const newReport = {
            id: `r${Date.now()}`,
            ...reportData,
            reportedAt: new Date().toISOString(),
            verified: false
        };
        MOCK_REPORTS.push(newReport);
        return newReport;
    },

    // GET /api/categories
    getCategories: async () => {
        await delay(300);
        return [...MOCK_CATEGORIES];
    },

    // POST /api/route
    getRoute: async ({ origin, destination, mode }) => {
        await delay(1000);

        // Generate a simple mock polyline between points with some intermediate steps
        const steps = 15;
        const coords = [];
        const start = [origin.lat, origin.lng];
        const end = [destination.lat, destination.lng];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const lat = start[0] + (end[0] - start[0]) * t;
            const lng = start[1] + (end[1] - start[1]) * t;

            // Add random jitter to simulate real roads (except start/end)
            const jitterLat = (i === 0 || i === steps) ? 0 : (Math.random() - 0.5) * 0.001;
            const jitterLng = (i === 0 || i === steps) ? 0 : (Math.random() - 0.5) * 0.001;

            coords.push({ lat: lat + jitterLat, lng: lng + jitterLng });
        }

        // Mock distance/duration calculation
        const R = 6371; // km
        const dLat = (end[0] - start[0]) * Math.PI / 180;
        const dLon = (end[1] - start[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(start[0] * Math.PI / 180) * Math.cos(end[0] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distMeters = Math.round(R * c * 1000 * 1.3); // +30% for road factor

        return {
            route: {
                coords,
                distanceMeters: distMeters,
                durationSeconds: Math.round(distMeters / 8), // approx 30km/h
                safetyScore: mode === 'safest' ? 0.92 : 0.75
            }
        };
    },

    // GET /api/stats
    getStats: async () => {
        await delay(600);
        return {
            totalReports: MOCK_REPORTS.length,
            recentReports: MOCK_REPORTS.filter(r => new Date(r.reportedAt) > new Date(Date.now() - 86400000)).length,
            byCategory: MOCK_REPORTS.reduce((acc, r) => {
                acc[r.category] = (acc[r.category] || 0) + 1;
                return acc;
            }, {}),
            hotspots: [
                { name: "Central Junction", score: 8.5 },
                { name: "Market Road", score: 6.2 },
                { name: "Highway Entry", score: 4.1 }
            ]
        };
    }
};
