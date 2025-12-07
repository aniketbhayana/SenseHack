import React, { useState } from 'react';
import MapView from '../MapView';

export default function MapPage() {
    const [mode, setMode] = useState('safest');

    return (
        <div className="w-full h-full relative">
            {/* Mode Toggle Overlay */}
            <div className="absolute top-4 left-4 md:left-auto md:right-4 z-[1000] bg-white p-2 rounded-lg shadow-lg flex gap-2">
                {/* <button
                    onClick={() => setMode('safest')}
                    className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${mode === 'safest' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Safest
                </button>
                <button
                    onClick={() => setMode('shortest')}
                    className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${mode === 'shortest' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Shortest
                </button> */}
            </div>

            <MapView selectedMode={mode} />
        </div>
    );
}
