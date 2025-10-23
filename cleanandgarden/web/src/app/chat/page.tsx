'use client'

import { RealtimeChat } from '@/components/realtime-chat'
import { useState } from 'react'

export default function ChatPage() {
  const [username, setUsername] = useState('')
  const [isJoined, setIsJoined] = useState(false)

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      setIsJoined(true)
    }
  }

  if (!isJoined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fefaf2]">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-center text-2xl font-bold">Chat en Tiempo Real</h1>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium">
                Tu nombre
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu nombre..."
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
            >
              Unirse al chat
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fefaf2]">
      <div className="border-b bg-white p-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-xl font-bold">Chat - {username}</h1>
          <button
            onClick={() => setIsJoined(false)}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-300"
          >
            Salir
          </button>
        </div>
      </div>
      <div className="mx-auto h-[calc(100vh-80px)] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-lg">
        <RealtimeChat roomName="general" username={username} />
      </div>
    </div>
  )
}

