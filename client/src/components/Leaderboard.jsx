import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

const REASON_TEXT = {
  disconnect_timeout: 'A player disconnected for 3 min — game ended early.',
  manual: 'Game ended early by host.',
};

/**
 * Full-screen leaderboard overlay shown at game end.
 *
 * Ranking:
 *   1st  — the player who completed 3 sets (the declared winner)
 *   2nd+ — sorted by total asset value (properties + bank) descending;
 *          ties broken by fewest cards played (lower = better positioning)
 *
 * When the game ends without a winner (disconnect / manual) the top entry is
 * whoever has the highest value; no "Winner" badge is shown.
 */
export default function Leaderboard({ leaderboard, reason, myId, onPlayAgain }) {
  if (!leaderboard?.length) return null;

  const [top, ...rest] = leaderboard;
  const subtitle = REASON_TEXT[reason] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="rounded-3xl p-5 w-full max-w-sm"
        style={{
          background: 'linear-gradient(160deg, #1c1917 0%, #0c0a09 100%)',
          border: '2px solid rgba(245,158,11,0.35)',
          boxShadow: '0 0 60px rgba(245,158,11,0.12)',
        }}
      >
        {/* ── Header ── */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-1.5">{top.isWinner ? '🏆' : '🎲'}</div>
          <h2 className="text-xl font-black text-yellow-300">Game Over</h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>

        {/* ── #1 Hero card ── */}
        <TopCard entry={top} isMe={top.id === myId} />

        {/* ── #2 and beyond ── */}
        {rest.length > 0 && (
          <div className="space-y-1.5 mt-2 mb-4">
            {rest.map((entry, i) => {
              const prevEntry = i === 0 ? top : rest[i - 1];
              // Mark a TIE only when two non-winner adjacent entries share the same value.
              // We never show TIE against the winner row (winner is #1 due to sets, not value).
              const isTied =
                !prevEntry.isWinner && prevEntry.totalValue === entry.totalValue;
              return (
                <RunnerRow
                  key={entry.id}
                  entry={entry}
                  isMe={entry.id === myId}
                  isTied={isTied}
                />
              );
            })}
          </div>
        )}

        {rest.length === 0 && <div className="mb-4" />}

        {/* ── Play again ── */}
        <button
          className="w-full font-black py-3 rounded-2xl text-base transition-all active:scale-95"
          style={{ background: '#facc15', color: '#000' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#fde047')}
          onMouseLeave={e => (e.currentTarget.style.background = '#facc15')}
          onClick={onPlayAgain}
        >
          Play Again →
        </button>
      </div>
    </div>
  );
}

// ── Top-ranked hero card ─────────────────────────────────────────────────────

function TopCard({ entry, isMe }) {
  const isWinner = entry.isWinner;
  const bg = isWinner
    ? 'linear-gradient(135deg, rgba(250,204,21,0.2) 0%, rgba(245,158,11,0.07) 100%)'
    : 'linear-gradient(135deg, rgba(148,163,184,0.1) 0%, rgba(100,116,139,0.05) 100%)';
  const border = isWinner ? 'rgba(250,204,21,0.45)' : 'rgba(148,163,184,0.22)';
  const nameCol = isWinner ? 'text-yellow-200' : 'text-white';
  const valueCol = isWinner ? 'text-yellow-300' : 'text-white';
  const medal = isWinner ? '🏆' : '🥇';

  return (
    <div
      className="rounded-2xl px-4 py-3.5 mb-1"
      style={{ background: bg, border: `2px solid ${border}` }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl flex-shrink-0">{medal}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-black text-base truncate ${nameCol}`}>{entry.name}</span>
            {isMe && <span className="text-xs text-gray-400">(you)</span>}
            {isWinner && (
              <span className="text-xs text-yellow-400 font-bold ml-auto">✓ 3 sets</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {entry.completeSets} set{entry.completeSets !== 1 ? 's' : ''}
            &nbsp;·&nbsp;{entry.cardsPlayed} cards played
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className={`font-black text-2xl tabular-nums leading-none ${valueCol}`}>
            ${entry.totalValue}M
          </div>
          <div className="text-xs text-gray-500 tabular-nums mt-0.5">
            ${entry.propValue}P&nbsp;+&nbsp;${entry.bankValue}B
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Runner-up rows ───────────────────────────────────────────────────────────

function RunnerRow({ entry, isMe, isTied }) {
  const medal = MEDALS[entry.rank - 1] || `#${entry.rank}`;

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
      style={{
        background: isMe ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isMe ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <span className="text-base w-6 text-center flex-shrink-0 leading-none">{medal}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-bold text-sm truncate ${isMe ? 'text-white' : 'text-gray-200'}`}>
            {entry.name}
          </span>
          {isMe && <span className="text-xs text-gray-400">(you)</span>}
          {isTied && (
            <span className="text-[10px] font-semibold text-sky-400/70">= TIE</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {entry.completeSets} set{entry.completeSets !== 1 ? 's' : ''}
          &nbsp;·&nbsp;{entry.cardsPlayed} played
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="font-black text-sm text-white tabular-nums">${entry.totalValue}M</div>
        <div className="text-xs text-gray-600 tabular-nums">
          ${entry.propValue}P&nbsp;+&nbsp;${entry.bankValue}B
        </div>
      </div>
    </div>
  );
}
