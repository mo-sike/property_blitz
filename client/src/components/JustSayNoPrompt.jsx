import React, { useState, useEffect } from 'react';

const ACTION_LABELS = {
  rent: 'Rent Charge',
  debtCollector: 'Debt Collector',
  birthday: "It's My Birthday",
  slyDeal: 'Sly Deal',
  forcedDeal: 'Forced Deal',
  dealBreaker: 'Deal Breaker',
};

const ACTION_ICONS = {
  rent: '🏦', debtCollector: '💰', birthday: '🎂',
  slyDeal: '🤫', forcedDeal: '🔄', dealBreaker: '💣',
};

export default function JustSayNoPrompt({ prompt, myId, myHand, onJustSayNo, onAccept }) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); onAccept(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [prompt?.type, prompt?.fromPlayerId]);

  if (!prompt) return null;

  const isResponder = prompt.currentResponderId === myId;
  const isJsnChain = prompt.jsnDepth > 0;
  const jsnCancelled = prompt.jsnDepth % 2 === 1;
  const hasJsn = myHand?.some(c => c.type === 'action' && c.subtype === 'justSayNo');
  const timerPct = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? '#22c55e' : timeLeft > 7 ? '#f59e0b' : '#ef4444';

  // Passive indicator for non-responders
  if (!isResponder) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 animate-slide-up"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '10px 20px' }}>
        <p className="text-sm text-gray-300 text-center">
          <span className="font-semibold text-white">{ACTION_LABELS[prompt.type] || prompt.type}</span>
          {' — '}
          {isJsnChain
            ? <span className="text-yellow-300">Just Say No {jsnCancelled ? 'played' : 'countered'} — awaiting response…</span>
            : <span className="text-gray-400">Waiting for response…</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm text-center animate-bounce-in"
        style={{ background: 'linear-gradient(160deg, #1c1c2e 0%, #12121e 100%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '28px 24px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>

        {/* Timer bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">Time to respond</span>
            <span className="font-bold" style={{ color: timerColor }}>{timeLeft}s</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${timerPct}%`, background: timerColor, boxShadow: `0 0 8px ${timerColor}` }}
            />
          </div>
        </div>

        {/* Icon */}
        <div className="text-5xl mb-4">
          {isJsnChain ? '🔄' : (ACTION_ICONS[prompt.type] || '⚡')}
        </div>

        {/* Content */}
        {isJsnChain && jsnCancelled ? (
          <>
            <h2 className="text-xl font-black mb-2 text-red-300">Just Say No Played!</h2>
            <p className="text-gray-300 text-sm mb-1">Your action was countered.</p>
            <p className="text-gray-500 text-xs mb-5">Counter back or let it stand.</p>
          </>
        ) : isJsnChain ? (
          <>
            <h2 className="text-xl font-black mb-2 text-yellow-300">JSN Countered!</h2>
            <p className="text-gray-300 text-sm mb-1">Your Just Say No was countered.</p>
            <p className="text-gray-500 text-xs mb-5">Play another JSN or accept the action.</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-black mb-2">
              {ACTION_LABELS[prompt.type] || 'Action Card!'}
            </h2>
            <p className="text-gray-300 text-sm mb-1">
              <span className="font-bold text-white">{prompt.fromPlayerName || 'Opponent'}</span> played this against you.
            </p>
            {prompt.amount > 0 && (
              <div className="my-3 text-3xl font-black text-yellow-400">${prompt.amount}M</div>
            )}
            <p className="text-gray-500 text-xs mb-5">Accept or use Just Say No</p>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {hasJsn && (
            <button
              className="btn-danger py-3.5 text-base font-black"
              style={{ letterSpacing: '0.05em' }}
              onClick={onJustSayNo}
            >
              🚫 Just Say No!
            </button>
          )}
          <button
            className="btn-ghost py-3 text-base"
            onClick={onAccept}
          >
            {jsnCancelled ? 'Accept — let JSN stand' : prompt.amount > 0 ? `Accept & Pay $${prompt.amount}M` : 'Accept'}
          </button>
        </div>

        {!hasJsn && (
          <p className="text-xs text-gray-600 mt-4">No Just Say No cards in hand</p>
        )}
      </div>
    </div>
  );
}
