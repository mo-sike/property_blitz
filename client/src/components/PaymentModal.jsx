import React, { useState, useEffect } from 'react';
import Card from './Card';
import { getPayableCards } from '../utils/cardHelpers';

export default function PaymentModal({ prompt, myPlayer, onPay }) {
  const [selected, setSelected] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          const payable = getPayableCards(myPlayer);
          onPay(payable.map(c => c.id));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [prompt?.fromPlayerId]);

  if (!prompt || prompt.phase !== 'payment') return null;

  const payable = getPayableCards(myPlayer);
  const totalAvailable = payable.reduce((s, c) => s + (c.value || 0), 0);
  const selectedCards = payable.filter(c => selected.has(c.id));
  const totalSelected = selectedCards.reduce((s, c) => s + (c.value || 0), 0);
  const owed = prompt.amount;
  const canAfford = totalAvailable >= owed;
  const enoughSelected = totalSelected >= owed;
  const canConfirm = canAfford ? enoughSelected : selected.size === payable.length;
  const fillPercent = Math.min(totalSelected / owed, 1) * 100;
  const overpaying = totalSelected > owed && canAfford;

  function toggle(cardId) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(payable.map(c => c.id)));
  }

  function handlePay() {
    onPay([...selected]);
    setSelected(new Set());
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-bounce-in"
        style={{ background: 'linear-gradient(160deg, #1c1c2e 0%, #12121e 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Timer bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">Time to pay</span>
            <span className="font-bold tabular-nums" style={{ color: timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e' }}>{timeLeft}s</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(timeLeft / 30) * 100}%`,
                background: timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e',
                boxShadow: `0 0 8px ${timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e'}`,
              }}
            />
          </div>
        </div>

        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl font-black mb-1">Pay Debt</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-300 text-sm">You owe</span>
            <span className="font-bold text-white text-sm">{prompt.fromPlayerName || 'opponent'}</span>
            <span className="text-2xl font-black text-yellow-400">${owed}M</span>
          </div>
        </div>

        {/* Debt progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-400">
              {canAfford ? 'Select enough to cover the debt' : 'Pay everything you have'}
            </span>
            <span className={`font-bold ${enoughSelected ? 'text-green-400' : overpaying ? 'text-yellow-300' : 'text-gray-300'}`}>
              ${totalSelected}M / ${owed}M
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${fillPercent}%`,
                background: enoughSelected ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#3b82f6,#2563eb)',
                boxShadow: enoughSelected ? '0 0 8px rgba(34,197,94,0.5)' : undefined,
              }}
            />
          </div>
        </div>

        {totalAvailable === 0 ? (
          <div className="py-6 text-center text-gray-400 italic">Nothing to pay with.</div>
        ) : (
          <>
            {/* Quick actions */}
            <div className="flex gap-2 mb-3">
              <button className="btn-ghost text-xs py-1 px-3" onClick={selectAll}>
                Select All
              </button>
              <button className="btn-ghost text-xs py-1 px-3" onClick={() => setSelected(new Set())}>
                Clear
              </button>
              <span className="ml-auto text-xs text-gray-500 self-center">
                Available: ${totalAvailable}M
              </span>
            </div>

            {/* Card grid */}
            <div className="max-h-56 overflow-y-auto thin-scroll pr-1">
              <div className="flex flex-wrap gap-2">
                {payable.map(c => {
                  const isSelected = selected.has(c.id);
                  return (
                    <div key={c.id} className="relative cursor-pointer group" onClick={() => toggle(c.id)}>
                      <div className={`transition-all duration-150 rounded-xl ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent scale-105' : 'opacity-70 group-hover:opacity-100'}`}>
                        <Card card={c} small />
                      </div>
                      {/* Selection badge */}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-black pointer-events-none"
                          style={{ background: '#facc15', boxShadow: '0 2px 6px rgba(250,204,21,0.5)' }}>
                          ✓
                        </div>
                      )}
                      <div className={`text-center text-xs mt-0.5 font-semibold ${isSelected ? 'text-yellow-300' : 'text-white/40'}`}>
                        ${c.value}M
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-5">
          {overpaying && (
            <span className="self-center text-xs text-yellow-300/70">
              Overpaying by ${totalSelected - owed}M
            </span>
          )}
          <button
            className={canConfirm ? 'btn-danger' : 'btn-ghost'}
            disabled={totalAvailable > 0 && !canConfirm}
            onClick={handlePay}
          >
            {totalAvailable === 0 ? 'Pay Nothing' : `Pay $${totalSelected}M`}
          </button>
        </div>
      </div>
    </div>
  );
}
