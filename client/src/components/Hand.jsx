import React from 'react';
import Card from './Card';

export default function Hand({ cards, selectedCardId, onCardClick, disabled }) {
  if (!cards || cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 italic text-sm">
        Hand is empty
      </div>
    );
  }

  return (
    <div className="overflow-x-auto thin-scroll pb-2 -mx-1 px-1">
      <div className="flex gap-2 min-w-max">
        {cards.map(card => (
          <div key={card.id} className={`transition-opacity ${disabled && card.id !== selectedCardId ? 'opacity-70' : ''}`}>
            <Card
              card={card}
              selected={card.id === selectedCardId}
              onClick={disabled ? undefined : () => onCardClick(card)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
