import React, { useState, useEffect } from 'react';
import { getColorMeta } from '../utils/cardHelpers';
import PlayerPeek from './PlayerPeek';

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

function cardDisplayName(card) {
  if (!card) return 'Property';
  if (card.isRainbowWild || card.colors?.[0] === 'rainbow') return 'Rainbow Wild';
  if (card.type === 'wildProperty') {
    return `${getColorMeta(card.color || card.colors?.[0]).label} Wild`;
  }
  return `${getColorMeta(card.color).label} Property`;
}

function PropertyChip({ card, label }) {
  if (!card) return null;
  const displayColor = card.color || card.colors?.[0];
  const meta = getColorMeta(displayColor);
  return (
    <div className="flex-1 min-w-0">
      {label && <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{label}</div>}
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.hex }} />
        <span className="text-white text-xs font-semibold truncate">{cardDisplayName(card)}</span>
        <span className="text-yellow-400 text-xs font-bold ml-auto tabular-nums">${card.value || 0}M</span>
      </div>
    </div>
  );
}

function SetChip({ color, cards }) {
  if (!color) return null;
  const meta = getColorMeta(color);
  const total = (cards || []).reduce((s, c) => s + (c.value || 0), 0);
  const count = cards?.length || 0;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg w-full"
      style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${meta.hex}55` }}
    >
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: meta.hex }} />
      <span className="text-white text-sm font-semibold">{meta.label} Set</span>
      <span className="text-gray-500 text-xs">{count} card{count !== 1 ? 's' : ''}</span>
      <span className="text-yellow-400 text-sm font-black ml-auto tabular-nums">${total}M</span>
    </div>
  );
}

function ActionPreview({ type, details }) {
  if (!details) return null;

  if (type === 'slyDeal' && details.targetCard) {
    return (
      <div className="mb-4 text-left">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Stealing your:</p>
        <PropertyChip card={details.targetCard} />
      </div>
    );
  }

  if (type === 'forcedDeal' && (details.targetCard || details.offeredCard)) {
    return (
      <div className="mb-4 text-left">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Forced swap:</p>
        <div className="flex items-end gap-1.5">
          <PropertyChip card={details.offeredCard} label="They give you" />
          <span className="text-gray-500 pb-2 flex-shrink-0 text-sm">↔</span>
          <PropertyChip card={details.targetCard} label="They take" />
        </div>
      </div>
    );
  }

  if (type === 'dealBreaker' && details.targetSetColor) {
    return (
      <div className="mb-4 text-left">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Stealing your complete set:</p>
        <SetChip color={details.targetSetColor} cards={details.targetSetCards} />
      </div>
    );
  }

  return null;
}

export default function JustSayNoPrompt({ prompt, myId, myHand, requesterPlayer, onJustSayNo, onAccept }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [timeExtended, setTimeExtended] = useState(false);
  const [showPeek, setShowPeek] = useState(false);

  useEffect(() => {
    setTimeLeft(30);
    setTimeExtended(false);
    setShowPeek(false);
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
  const requesterName = requesterPlayer?.name || prompt.fromPlayerName || 'Opponent';

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
        <div className="mb-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-gray-500">Time to respond</span>
            <div className="flex items-center gap-2">
              {!timeExtended && (
                <button
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#9ca3af'; }}
                  onClick={() => { setTimeLeft(t => t + 30); setTimeExtended(true); }}
                >
                  +30s
                </button>
              )}
              <span className="font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</span>
            </div>
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
            <p className="text-gray-500 text-xs mb-3">Counter back or let it stand.</p>
            <ActionPreview type={prompt.type} details={prompt.details} />
          </>
        ) : isJsnChain ? (
          <>
            <h2 className="text-xl font-black mb-2 text-yellow-300">JSN Countered!</h2>
            <p className="text-gray-300 text-sm mb-1">Your Just Say No was countered.</p>
            <p className="text-gray-500 text-xs mb-3">Play another JSN or accept the action.</p>
            <ActionPreview type={prompt.type} details={prompt.details} />
          </>
        ) : (
          <>
            <h2 className="text-xl font-black mb-2">
              {ACTION_LABELS[prompt.type] || 'Action Card!'}
            </h2>
            <p className="text-gray-300 text-sm mb-1">
              <span className="font-bold text-white">{requesterName}</span> played this against you.
            </p>
            {prompt.amount > 0 && (
              <div className="my-3 text-3xl font-black text-yellow-400">${prompt.amount}M</div>
            )}
            <p className="text-gray-500 text-xs mb-3">Accept or use Just Say No</p>
            <ActionPreview type={prompt.type} details={prompt.details} />
          </>
        )}

        {/* Holdings peek */}
        {requesterPlayer && (
          <div className="mb-4">
            <button
              className="text-xs font-semibold transition-colors w-full text-left"
              style={{ color: showPeek ? '#60a5fa' : '#4b5563' }}
              onClick={() => setShowPeek(s => !s)}
            >
              {showPeek ? '▲ Hide' : '▼ View'} {requesterName}'s holdings
            </button>
            {showPeek && <PlayerPeek player={requesterPlayer} />}
          </div>
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
