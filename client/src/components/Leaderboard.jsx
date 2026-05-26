import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

const REASON_TEXT = {
  disconnect_timeout: 'A player disconnected for 3 minutes — game ended.',
  manual: 'Game ended early by a player.',
};

export default function Leaderboard({ leaderboard, reason, myId, onPlayAgain }) {
  const subtitle = REASON_TEXT[reason] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="rounded-3xl p-6 w-full max-w-sm"
        style={{
          background: 'linear-gradient(160deg, #1c1917 0%, #0c0a09 100%)',
          border: '2px solid rgba(245,158,11,0.35)',
          boxShadow: '0 0 60px rgba(245,158,11,0.12)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-yellow-300">Game Over</h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{subtitle}</p>
          )}
        </div>

        {/* Rankings */}
        <div className="space-y-2 mb-5">
          {leaderboard.map(entry => {
            const medal = MEDALS[entry.rank - 1] || `#${entry.rank}`;
            const isMe = entry.id === myId;

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                style={{
                  background: entry.isWinner
                    ? 'rgba(250,204,21,0.1)'
                    : isMe
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    entry.isWinner
                      ? 'rgba(250,204,21,0.3)'
                      : isMe
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.07)'
                  }`,
                }}
              >
                <span className="text-xl w-7 text-center flex-shrink-0">{medal}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-bold text-sm truncate ${entry.isWinner ? 'text-yellow-300' : 'text-white'}`}>
                      {entry.name}
                    </span>
                    {isMe && <span className="text-xs text-gray-400 font-normal">(you)</span>}
                    {entry.isWinner && (
                      <span className="text-xs text-yellow-400 font-semibold">✓ 3 sets</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {entry.completeSets} set{entry.completeSets !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-700">·</span>
                    <span className="text-xs text-gray-500">
                      {entry.cardsPlayed} played
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`font-black text-sm tabular-nums ${entry.isWinner ? 'text-yellow-300' : 'text-white'}`}>
                    ${entry.totalValue}M
                  </div>
                  <div className="text-xs text-gray-600">
                    ${entry.propValue}M + ${entry.bankValue}M
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="w-full font-black py-3 rounded-2xl text-base transition-colors active:scale-95"
          style={{ background: '#facc15', color: '#000' }}
          onMouseEnter={e => e.target.style.background = '#fde047'}
          onMouseLeave={e => e.target.style.background = '#facc15'}
          onClick={onPlayAgain}
        >
          Play Again →
        </button>
      </div>
    </div>
  );
}
