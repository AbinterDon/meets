import React, { useEffect, useState } from 'react';

const MatchList = ({ onSelectMatch, activeMatch }) => {
    const [matches, setMatches] = useState([]);
    const apiHost = `http://${window.location.hostname}:8080`;

    useEffect(() => {
        fetch(`${apiHost}/api/matches`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => setMatches(data || []))
            .catch(err => console.error("Failed to load matches", err));
    }, []);

    return (
        <div className="w-full h-full flex flex-col bg-white border-r">
            <div className="p-4 border-b font-bold text-lg text-gray-700">Matches</div>
            <div className="flex-1 overflow-y-auto">
                {matches.length === 0 && <div className="p-4 text-gray-500 text-center">No matches yet. Go swipe!</div>}
                {matches.map(m => (
                    <div
                        key={m.id}
                        onClick={() => onSelectMatch(m)}
                        className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${activeMatch?.username === m.username ? 'bg-violet-50 border-r-4 border-violet-500' : ''}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-3">
                            {m.image_url ? (
                                <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">{m.username[0]}</div>
                            )}
                        </div>
                        <div>
                            <div className="font-bold text-gray-800">{m.name || m.username}</div>
                            <div className="text-xs text-gray-500">Say hi!</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MatchList;
