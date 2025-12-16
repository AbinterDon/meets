
import React, { useState, useEffect, useRef } from 'react'
import MatchList from './MatchList';

const Chat = ({ user }) => {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [socket, setSocket] = useState(null)
    const [targetUser, setTargetUser] = useState(null) // Object with username, name, image_url

    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Load History when selecting a user
    useEffect(() => {
        if (!targetUser) return;

        setMessages([]); // Clear previous
        const apiHost = `http://${window.location.hostname}:8080`;
        fetch(`${apiHost}/api/messages?other_user=${targetUser.username}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                // Convert to UI format
                const formatted = (data || []).map(m => ({
                    id: m.id,
                    from: m.sender,
                    content: m.content,
                    type: 'message'
                }));
                setMessages(formatted);
            })
            .catch(err => console.error("Failed to load history", err));
    }, [targetUser]);

    useEffect(() => {
        // Determine WS protocol based on window protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = `${protocol}//${window.location.hostname}:8080/ws`;

        console.log(`Connecting to WebSocket at ${wsHost}...`)
        const newSocket = new WebSocket(wsHost)

        newSocket.onopen = () => {
            console.log('Connected to WebSocket')
            // Send login message
            newSocket.send(JSON.stringify({
                type: 'login',
                content: user
            }))
        }

        newSocket.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            console.log('Received:', msg)

            // We only care about chat messages here
            if (msg.from) {
                setMessages(prev => [...prev, msg])
            }
        }

        newSocket.onclose = () => console.log('WebSocket disconnected')
        newSocket.onerror = (err) => console.error('WebSocket error:', err)

        setSocket(newSocket)

        return () => newSocket.close()
    }, [user])

    const sendMessage = (e) => {
        e.preventDefault()
        if (!input.trim() || !socket || !targetUser) return

        const msg = {
            type: 'message',
            to: targetUser.username,
            content: input,
            from: user
        }

        socket.send(JSON.stringify(msg))

        // Optimistic update
        setMessages(prev => [...prev, msg])
        setInput('')

        // IME fix is handled by input element logic usually, but here we just send on submit
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            sendMessage(e);
        }
    }

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
                                return (
                                    <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe
                                            ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
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
