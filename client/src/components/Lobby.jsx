import React, { useState } from 'react';

const FLOAT_CARDS = ['🏠', '💰', '🎂', '🚫', '🏦', '🎴', '✌️', '💣'];

export default function Lobby({ state, actions }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join'

  const gs = state.gameState;
  const inRoom = !!state.roomCode && gs;
  const isHost = gs && gs.hostId === state.myId;

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    actions.createRoom(name.trim());
    setMode('waiting');
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    actions.joinRoom(joinCode.trim().toUpperCase(), name.trim());
    setMode('waiting');
  }

  // ── Waiting room ────────────────────────────────────────────────────────
  if (inRoom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 relative overflow-hidden">
        <FloatingCards />
        <div className="text-center relative z-10">
          <h1 className="text-5xl font-black mb-1" style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Property Blitz
          </h1>
          <p className="text-green-300/80 text-sm">Collect 3 complete sets to win!</p>
        </div>

        <div className="glass rounded-2xl p-8 w-full max-w-md relative z-10 animate-bounce-in">
          <div className="text-center mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-2">Room Code</p>
            <p className="text-5xl font-mono font-black tracking-[0.15em]"
              style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {state.roomCode}
            </p>
            <p className="text-xs text-gray-400 mt-2">Share this code with friends</p>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-3">
              Players ({gs.players.length}/5)
            </p>
            <ul className="space-y-2">
              {gs.players.map((p, i) => (
                <li key={p.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white'}`}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold">{p.name}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {!p.connected && <span className="text-xs text-gray-500">⚫</span>}
                    {p.id === gs.hostId && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(234,179,8,0.2)', color: '#fde68a', border: '1px solid rgba(234,179,8,0.3)' }}>
                        Host
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {isHost ? (
            <button
              className="btn-primary w-full py-3.5 text-base"
              onClick={actions.startGame}
              disabled={gs.players.length < 2}
            >
              {gs.players.length < 2 ? '⏳ Waiting for players…' : '🎮 Start Game'}
            </button>
          ) : (
            <div className="text-center text-gray-400 py-2 flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Waiting for host to start…
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Landing ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-4 relative overflow-hidden">
      <FloatingCards />

      {/* Title */}
      <div className="text-center relative z-10">
        <div className="text-6xl mb-3">🏠</div>
        <h1 className="text-6xl font-black mb-3" style={{ background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Property Blitz
        </h1>
        <p className="text-green-300/80 text-lg">Real-time multiplayer card game · 2–5 players</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
          <span>🏆 Collect 3 sets</span>
          <span className="text-white/20">·</span>
          <span>💰 Bank $10M</span>
          <span className="text-white/20">·</span>
          <span>🚫 Just Say No</span>
        </div>
      </div>

      {/* Action buttons / forms */}
      <div className="relative z-10 w-full max-w-sm">
        {!mode && (
          <div className="flex flex-col gap-3 animate-bounce-in">
            <button className="btn-primary py-4 text-lg w-full" onClick={() => setMode('create')}>
              🎮 Create Room
            </button>
            <button className="btn-ghost py-4 text-lg w-full" onClick={() => setMode('join')}>
              🔗 Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="glass rounded-2xl p-8 flex flex-col gap-4 animate-slide-up">
            <h2 className="text-xl font-black text-center">Create a Room</h2>
            <input
              autoFocus
              className="rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
            <button className="btn-primary py-3 text-base" type="submit" disabled={!name.trim()}>
              Create Room →
            </button>
            <button className="btn-ghost py-2" type="button" onClick={() => setMode(null)}>
              ← Back
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="glass rounded-2xl p-8 flex flex-col gap-4 animate-slide-up">
            <h2 className="text-xl font-black text-center">Join a Room</h2>
            <input
              autoFocus
              className="rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
            <input
              className="rounded-xl px-4 py-3 text-white placeholder-gray-400 uppercase tracking-[0.25em] font-mono text-xl text-center focus:outline-none focus:ring-2 focus:ring-yellow-400/60 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              placeholder="CODE"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
            />
            <button
              className="btn-primary py-3 text-base"
              type="submit"
              disabled={!name.trim() || joinCode.length < 4}
            >
              Join Room →
            </button>
            <button className="btn-ghost py-2" type="button" onClick={() => setMode(null)}>
              ← Back
            </button>
          </form>
        )}
      </div>

      {state.errorMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 animate-bounce-in">
          ⚠️ {state.errorMessage}
        </div>
      )}
    </div>
  );
}

function FloatingCards() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {FLOAT_CARDS.map((icon, i) => (
        <div
          key={i}
          className="absolute text-2xl opacity-[0.07] animate-float select-none"
          style={{
            left: `${8 + (i * 12.5) % 88}%`,
            top: `${5 + (i * 17) % 80}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${5 + (i % 3)}s`,
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  );
}
