import React from 'react';
import { getColorMeta, SET_SIZES, countPropertyCards } from '../utils/cardHelpers';

export default function WildReassignModal({ card, fromColor, playerProperties, onMove, onCancel }) {
  const validColors = card.isRainbowWild ? Object.keys(SET_SIZES) : card.colors;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-5 w-full max-w-xs"
        style={{ background: 'rgba(15,15,25,0.97)', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="font-black text-white text-base mb-0.5">Move Wild Card</h3>
          <p className="text-xs text-gray-400">
            {card.isRainbowWild ? 'Choose any property set' : `Valid sets: ${card.colors.map(c => getColorMeta(c).label).join(' or ')}`}
          </p>
        </div>

        <div className="space-y-2">
          {validColors.map(color => {
            const isCurrent = color === fromColor;
            const meta = getColorMeta(color);
            const arr = playerProperties[color] || [];
            const propCount = countPropertyCards(arr);
            const setSize = SET_SIZES[color];

            return (
              <button
                key={color}
                disabled={isCurrent}
                onClick={() => onMove(color)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isCurrent
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:scale-[1.02] active:scale-95 cursor-pointer hover:brightness-110'}`}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isCurrent ? 'rgba(255,255,255,0.08)' : meta.hex + '66'}`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${meta.bg}`} />
                  <span className="text-white">{meta.label}</span>
                  {isCurrent && <span className="text-xs text-gray-500 font-normal">(here)</span>}
                </div>
                <span className="text-xs text-gray-400 tabular-nums">{propCount}/{setSize}</span>
              </button>
            );
          })}
        </div>

        <button
          className="mt-4 w-full text-sm text-gray-500 hover:text-white transition-colors py-1.5 rounded-xl"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
