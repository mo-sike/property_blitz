import React from 'react';
import { getColorMeta, SET_SIZES } from '../utils/cardHelpers';

/**
 * Compact read-only view of another player's bank and properties.
 * Used inside action-response modals so the responding player can
 * make an informed decision without leaving the modal.
 */
export default function PlayerPeek({ player }) {
  if (!player) return null;

  const bankTotal = (player.bank || []).reduce((s, c) => s + (c.value || 0), 0);
  const moneyCount = (player.bank || []).filter(c => c.type === 'money').length;

  const propRows = Object.entries(player.properties || {}).reduce((acc, [color, stacks]) => {
    const cards = stacks.flat().filter(c => c.type === 'property' || c.type === 'wildProperty');
    if (cards.length === 0) return acc;
    const value = cards.reduce((s, c) => s + (c.value || 0), 0);
    const setSize = SET_SIZES[color] || 0;
    acc.push({ color, count: cards.length, value, setSize, complete: setSize > 0 && cards.length >= setSize });
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  const propTotal = propRows.reduce((s, r) => s + r.value, 0);

  return (
    <div
      className="rounded-xl overflow-hidden mt-3 text-left"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="text-xs font-bold text-gray-200 truncate">{player.name}'s holdings</span>
        <span className="text-xs text-yellow-400 font-black tabular-nums ml-2">
          ${bankTotal + propTotal}M
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-1.5">
        {/* Bank */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Bank</span>
            {moneyCount > 0 && (
              <span className="text-[10px] text-gray-600">
                {moneyCount} card{moneyCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-emerald-400 tabular-nums">${bankTotal}M</span>
        </div>

        {propRows.length > 0 && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }} />
        )}

        {/* Properties */}
        {propRows.length === 0 ? (
          <p className="text-[10px] text-gray-600">No properties on table</p>
        ) : (
          propRows.map(({ color, count, value, setSize, complete }) => {
            const meta = getColorMeta(color);
            return (
              <div key={color} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: meta.hex }}
                />
                <span className="text-[10px] text-gray-400 flex-1 truncate">{meta.label}</span>
                <span className="text-[10px] tabular-nums" style={{ color: complete ? '#4ade80' : '#6b7280' }}>
                  {count}{setSize ? `/${setSize}` : ''}{complete ? ' ✓' : ''}
                </span>
                <span className="text-[10px] text-yellow-400 tabular-nums">${value}M</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
