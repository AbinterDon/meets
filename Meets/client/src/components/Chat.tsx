
import React, { useState, useEffect, useRef } from 'react'
import MatchList from './MatchList';
import { User, Message } from '../types';

interface ChatProps {
    user: string | null;
}

interface WSMessage extends Message {
    type?: string;
    to?: string;
}

const Chat: React.FC<ChatProps> = ({ user }) => {
    const [messages, setMessages] = useState<WSMessage[]>([])
    const [input, setInput] = useState('')
    const [socket, setSocket] = useState<WebSocket | null>(null)
    const [targetUser, setTargetUser] = useState<User | null>(null) // Object with username, name, image_url

    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])


    // Load History & Mark Read
    useEffect(() => {
        if (!targetUser) return;

        const apiHost = `http://${window.location.hostname}:8080`;
        const headers = {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        };

        // 1. Mark as Read
        fetch(`${apiHost}/api/messages/mark_read`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ other_user: targetUser.username })
        }).catch(err => console.error("Failed to mark read", err));

        // 2. Fetch History
        fetch(`${apiHost}/api/messages?other_user=${targetUser.username}`, { headers })
            .then(res => res.json())
            .then(data => {
                const formatted: WSMessage[] = (data || []).map((m: any) => ({
                    id: m.id,
                    from: m.sender,
                    content: m.content,
                    created_at: m.created_at,
                    is_read: m.is_read,
                    type: 'message'
                }));
                setMessages(formatted);
            })
            .catch(err => console.error("Failed to load history", err));
    }, [targetUser]);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = `${protocol}//${window.location.hostname}:8080/ws`;
        const newSocket = new WebSocket(wsHost)

        newSocket.onopen = () => {
            newSocket.send(JSON.stringify({ type: 'login', content: user }))
        }

        newSocket.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            if (msg.from) {
                // If we are chatting with this user, or if it's a new message, we append
                // Ideally we should also mark as read if active?
                // For now just append.
                setMessages(prev => [...prev, msg])
            }
        }
        setSocket(newSocket)
        return () => newSocket.close()
    }, [user])

    const sendMessage = (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault()
        if (!input.trim() || !socket || !targetUser) return

        const msg: WSMessage = {
            id: Date.now(), // Temp ID
            type: 'message',
            to: targetUser.username,
            content: input,
            from: user || '',
            created_at: new Date().toISOString(), // Optimistic timestamp
            is_read: false
        }

        socket.send(JSON.stringify(msg))
        setMessages(prev => [...prev, msg])
        setInput('')
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            sendMessage(e);
        }
    }

    const formatTime = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex w-full h-[600px] max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            {/* Sidebar */}
            <div className="w-1/3 border-r h-full flex flex-col">
                <MatchList onSelectMatch={setTargetUser} activeMatch={targetUser} />
            </div>

            {/* Main Chat Area */}
            <div className="w-2/3 flex flex-col h-full bg-gray-50">
                {!targetUser ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a match to start chatting
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-white border-b flex items-center shadow-sm">
                            <div className="font-bold text-gray-800 text-lg">{targetUser.name || targetUser.username}</div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, index) => {
                                const isMe = msg.from === user;
                                const currentDate = new Date(msg.created_at).toLocaleDateString();
                                const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toLocaleDateString() : null;
                                const showDateSeparator = currentDate !== prevDate;

                                const dateLabel = (() => {
                                    const today = new Date().toLocaleDateString();
                                    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
                                    if (currentDate === today) return "Today";
                                    if (currentDate === yesterday) return "Yesterday";
                                    return currentDate;
                                })();

                                return (
                                    <React.Fragment key={index}>
                                        {showDateSeparator && (
                                            <div className="flex justify-center my-4">
                                                <span className="bg-gray-200 text-gray-500 text-xs px-3 py-1 rounded-full">
                                                    {dateLabel}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe
                                                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-br-none'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                                }`}>
                                                {msg.content}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 px-1">
                                                {formatTime(msg.created_at)}
                                                {isMe && (
                                                    <span className={msg.is_read ? "text-violet-500" : "text-gray-300"}>
                                                        {msg.is_read ? '✓✓' : '✓'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={sendMessage} className="p-4 bg-white border-t">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder={`Message ${targetUser.name || targetUser.username}...`}
                                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all border border-transparent focus:bg-white"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="p-2 bg-violet-600 text-white rounded-full hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

export default Chat;
