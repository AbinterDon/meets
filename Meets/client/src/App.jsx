import { useState, useEffect } from 'react'
import SwipeCard from './components/SwipeCard'
import Chat from './components/Chat'
import AuthScreen from './components/AuthScreen'
import ProfileEditor from './components/ProfileEditor'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(localStorage.getItem('username'))
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('swipe') // 'swipe', 'chat', 'profile'


  useEffect(() => {
    if (!token) return

    // API URL using dynamic hostname
    const apiHost = `http://${window.location.hostname}:8080`;
    setLoading(true)

    // First check if token/user is still valid
    fetch(`${apiHost}/api/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          // Token invalid or user deleted -> Logout
          throw new Error("User invalid")
        }
        return fetch(`${apiHost}/api/profiles`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch profiles')
        return res.json()
      })
      .then(data => {
        setProfiles(data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        if (err.message === "User invalid") {
          handleLogout()
        } else {
          setError(err.message)
          setLoading(false)
        }
      })
  }, [token])

  const handleLogin = (newToken, newUsername) => {
    setToken(newToken)
    setUser(newUsername)
    localStorage.setItem('token', newToken)
    localStorage.setItem('username', newUsername)
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('username')
  }

  const handleSwipe = (direction) => {
    console.log(`Swiped ${direction} on ${profiles[0].name}`)
    // Remove the first profile
    setProfiles(prev => prev.slice(1))
  }

  if (!token) {
    return <AuthScreen onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
          Meets
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('swipe')}
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${view === 'swipe' ? 'bg-pink-100 text-pink-600' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            Swipe
          </button>
          <button
            onClick={() => setView('chat')}
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${view === 'chat' ? 'bg-violet-100 text-violet-600' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setView('profile')}
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${view === 'profile' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            Profile
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1 rounded-full text-sm font-semibold text-red-500 hover:bg-red-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {view === 'chat' ? (
        <Chat user={user} /> // Passing username for now, WS will use it but validation is loose. For strict auth, pass token to WS too.
      ) : view === 'profile' ? (
        <ProfileEditor token={token} />
      ) : (
        <>
          {loading && <div className="text-xl text-gray-500 animate-pulse">Finding matches...</div>}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>Error: {error}</p>
              <p className="text-sm">Make sure the backend server is running.</p>
            </div>
          )}

          {profiles.length > 0 ? (
            <SwipeCard
              profile={profiles[0]}
              onSwipe={handleSwipe}
            />
          ) : (
            !loading && !error && (
              <div className="text-center text-gray-500 text-xl p-8 bg-white rounded-xl shadow">
                <p>No more profiles!</p>
                <p className="text-sm mt-2">Check back later.</p>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}

export default App
