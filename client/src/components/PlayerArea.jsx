import React, { useState } from 'react';
import PropertySet from './PropertySet';
import Card from './Card';
import { isCompleteSet, SET_SIZES, getCompleteSets } from '../utils/cardHelpers';

export default function PlayerArea({
  player, isMe, isCurrent, isWinner,
  onPropertyClick, selectedCardId, small, onWildClick,
}) {
  const [bankExpanded, setBankExpanded] = useState(false);
  const bankTotal = (player.bank || []).reduce((s, c) => s + (c.value || 0), 0);
  const filledColors = Object.entries(player.properties || {}).filter(([, arr]) => arr.length > 0);
  const completeSets = getCompleteSets(player).length;

  const borderStyle = isWinner
    ? { border: '2px solid #facc15', boxShadow: '0 0 20px rgba(250,204,21,0.25)', background: 'rgba(250,204,21,0.05)' }
    : isCurrent && !isMe
    ? { border: '2px solid rgba(96,165,250,0.5)', background: 'rgba(96,165,250,0.04)' }
    : isMe
    ? { border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)' }
    : { border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' };

  return (
    <div className="rounded-2xl p-3 transition-all" style={borderStyle}>
      {/* Player header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
          isMe ? 'bg-yellow-500 text-black' : 'bg-white/15 text-white'
        }`}
          style={isCurrent ? { boxShadow: '0 0 0 2px rgba(96,165,250,0.7)' } : {}}>
          {player.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sm truncate">{player.name}</span>
            {isMe && <span className="text-xs text-yellow-400 font-semibold">(You)</span>}
            {isCurrent && <span className="text-xs text-blue-300 font-semibold animate-pulse-slow">● Turn</span>}
            {isWinner && <span className="text-xs text-yellow-400 font-bold">🏆 Winner!</span>}
            {!player.connected && <span className="text-xs text-gray-500">⚫ Offline</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            <span>✊ {player.handCount ?? player.hand?.length ?? 0} cards</span>
            {completeSets > 0 && (
              <span className="text-yellow-400/80">{completeSets}/3 sets</span>
            )}
          </div>
        </div>

        {/* Bank badge */}
        <button
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            bankTotal >= 10
              ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
              : 'bg-white/8 text-gray-300 border border-white/10'
          } ${isMe && player.bank?.length > 0 ? 'cursor-pointer hover:bg-white/15' : 'cursor-default'}`}
          onClick={isMe && player.bank?.length > 0 ? () => setBankExpanded(x => !x) : undefined}
        >
          <span>💰</span>
          <span>${bankTotal}M</span>
          {isMe && player.bank?.length > 0 && (
            <span className="text-white/40">{bankExpanded ? '▲' : '▼'}</span>
          )}
        </button>
      </div>

      {/* Bank cards (expanded for me, always visible for others with cards) */}
      {player.bank && player.bank.length > 0 && (bankExpanded || !isMe) && (
        <div className="mb-3 pl-1">
          <div className="text-xs text-gray-500 mb-1.5">Bank</div>
          <div className="flex flex-wrap gap-1">
            {player.bank.map(c => (
              <Card key={c.id} card={c} small />
            ))}
          </div>
        </div>
      )}

      {/* Properties */}
      {filledColors.length > 0 ? (
        <div className="space-y-1.5">
          {filledColors.map(([color, cards]) => (
            <PropertySet
              key={color}
              color={color}
              cards={cards}
              isComplete={isCompleteSet(color, player)}
              small
              selectedCardId={selectedCardId}
              onCardClick={onPropertyClick ? (c) => onPropertyClick(c, color, player) : undefined}
              onWildClick={isMe && onWildClick ? onWildClick : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-600 italic pl-1">No properties yet</div>
      )}
    </div>
  );
}
