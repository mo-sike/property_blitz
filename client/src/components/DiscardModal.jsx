import React, { useState, useEffect } from 'react';
import Card from './Card';

/**
 * DiscardModal — shown when the current player's hand exceeds 7 cards at end
 * of turn.  They tap/click cards to mark them for discard; the Confirm button
 * activates only when exactly `excess` cards are selected.
 *
 * Props:
 *   cards   — full hand array
 *   excess  — number of cards that must be discarded (hand.length - 7)
 *   onConfirm(cardIds[]) — called with the selected card IDs
 *   onCancel — close without discarding (player can play more cards first)
 */
export default function DiscardModal({ cards, excess, onConfirm, onCancel }) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  function toggle(cardId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else if (next.size < excess) {
        next.add(cardId);
      }
      return next;
    });
  }

  const canConfirm = selectedIds.size === excess;
  const remaining  = excess - selectedIds.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl p-4"
        style={{ background: 'linear-gradient(160deg,#1c1917 0%,#0c0a09 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />

        {/* ── Header ── */}
        <div className="text-center mb-3">
          <div className="text-2xl mb-1">🗑️</div>
          <h3 className="text-base font-black text-white">Discard Cards</h3>
          <p className={`text-xs mt-0.5 transition-colors ${canConfirm ? 'text-green-400' : 'text-gray-400'}`}>
            {canConfirm
              ? `${excess} card${excess !== 1 ? 's' : ''} selected — ready to confirm`
              : `Select ${remaining} more card${remaining !== 1 ? 's' : ''} to discard`}
          </p>
        </div>

        {/* ── Card grid ── */}
        <div className="flex flex-wrap justify-center gap-2 max-h-[52vh] overflow-y-auto thin-scroll py-1 mb-4">
          {cards.map(card => {
            const isSelected   = selectedIds.has(card.id);
            const isDisabled   = !isSelected && selectedIds.size >= excess;
            return (
              <div
                key={card.id}
                className="relative select-none"
                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                onClick={() => !isDisabled && toggle(card.id)}
              >
                {/* Card itself — dim when disabled or selected */}
                <div
                  className="transition-all duration-150"
                  style={{
                    opacity:   isSelected ? 0.55 : isDisabled ? 0.35 : 1,
                    transform: isSelected ? 'scale(0.93)' : undefined,
                  }}
                >
                  <Card card={card} small />
                </div>

                {/* Red "X" overlay when selected */}
                {isSelected && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none"
                    style={{ background: 'rgba(239,68,68,0.55)' }}
                  >
                    <span className="text-white text-2xl font-black leading-none">✕</span>
                  </div>
                )}

                {/* Subtle lock icon when slot is full but this card isn't chosen */}
                {isDisabled && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none"
                    style={{ background: 'rgba(0,0,0,0.25)' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 text-sm font-semibold transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95"
            style={{
              background: canConfirm ? '#ef4444' : 'rgba(239,68,68,0.25)',
              color: canConfirm ? '#fff' : 'rgba(255,255,255,0.35)',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(Array.from(selectedIds))}
          >
            Discard {excess} card{excess !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
