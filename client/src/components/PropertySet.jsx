import React from 'react';
import Card from './Card';
import { getColorMeta, SET_SIZES, countPropertyCards, getRentForSet } from '../utils/cardHelpers';

export default function PropertySet({ color, cards, isComplete, onCardClick, selectedCardId, small }) {
  const meta = getColorMeta(color);
  const propCount = countPropertyCards(cards);
  const size = SET_SIZES[color] || 0;
  const rent = getRentForSet(color, cards);
  const hasHouse = cards.some(c => c.type === 'action' && c.subtype === 'house');
  const hasHotel = cards.some(c => c.type === 'action' && c.subtype === 'hotel');

  return (
    <div className={`rounded-xl p-2 border transition-all duration-200 ${isComplete ? 'set-complete' : 'border-white/10 bg-white/[0.03]'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
          {meta.label}
        </span>
        {/* Progress pips */}
        <div className="flex gap-1">
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i < propCount ? meta.bg : 'bg-white/15'}`}
            />
          ))}
        </div>
        {isComplete && (
          <>
            <span className="text-xs text-yellow-400 font-bold ml-auto">✓</span>
            <span className="text-xs text-white/60 font-semibold">
              ${rent}M{hasHouse && !hasHotel && ' 🏠'}{hasHotel && ' 🏨'}
            </span>
          </>
        )}
        {!isComplete && (
          <span className="text-xs text-gray-500 ml-auto">${rent}M</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-wrap gap-1">
        {cards.map(c => (
          <Card
            key={c.id}
            card={c}
            small={small !== false}
            selected={c.id === selectedCardId}
            onClick={onCardClick ? () => onCardClick(c) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
