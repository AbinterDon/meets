import React, { useEffect, useState } from 'react';
import { User } from '../types';

interface MatchListProps {
    onSelectMatch: (match: User) => void;
    activeMatch: User | null;
}

const MatchList: React.FC<MatchListProps> = ({ onSelectMatch, activeMatch }) => {
    const [matches, setMatches] = useState<User[]>([]);
    const apiHost = `http://${window.location.hostname}:8080`;

    // Polling for updates (simple real-time substitute)
    useEffect(() => {
        const fetchMatches = () => {
            fetch(`${apiHost}/api/matches`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => setMatches(data || []))
                .catch(err => console.error("Failed to load matches", err));
        };

        fetchMatches();
        const interval = setInterval(fetchMatches, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const formatTime = (isoString: string | undefined) => {
        if (!isoString || isoString.startsWith('1970')) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full h-full flex flex-col bg-white border-r">
            <div className="p-4 border-b font-bold text-lg text-gray-700 flex justify-between items-center">
                <span>Matches</span>
                <button onClick={() => window.location.reload()} className="text-xs text-violet-500 hover:underline">Refresh</button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {matches.length === 0 && <div className="p-4 text-gray-500 text-center">No matches yet. Go swipe!</div>}
                {matches.map(m => (
                    <div
                        key={m.id}
                        onClick={() => onSelectMatch(m)}
                        className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${activeMatch?.username === m.username ? 'bg-violet-50 border-r-4 border-violet-500' : ''}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-3 relative flex-shrink-0">
                            {m.image_url ? (
                                <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">{m.username[0]}</div>
                            )}
                            {(m.unread_count || 0) > 0 && (
                                <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <span className="font-bold text-gray-800 truncate">{m.name || m.username}</span>
                                <span className="text-xs text-gray-400 whitespace-nowrap ml-1">{formatTime(m.last_message_time)}</span>
                            </div>
                            <div className="text-sm text-gray-500 truncate flex justify-between">
                                <span className="truncate">{m.last_message || "Say hi!"}</span>
                                {(m.unread_count || 0) > 0 && (
                                    <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                        {m.unread_count}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MatchList;
