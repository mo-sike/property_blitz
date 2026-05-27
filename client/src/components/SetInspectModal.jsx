import React, { useEffect } from 'react';
import PropertySet from './PropertySet';

/**
 * Bottom-sheet modal (mobile) / centred dialog (desktop) that shows a
 * property set at full card size with all interactive controls.
 */
export default function SetInspectModal({
  color,
  cards,
  isComplete,
  onClose,
  onCardClick,
  selectedCardId,
  onWildClick,
}) {
  // Escape key closes the modal
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!color || !cards) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet / dialog */}
      <div className="relative w-full max-w-xs bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[78vh]">
        {/* Drag handle – mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Scrollable card area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 thin-scroll">
          <PropertySet
            color={color}
            cards={cards}
            isComplete={isComplete}
            selectedCardId={selectedCardId}
            onCardClick={onCardClick}
            onWildClick={onWildClick}
            small={false}
          />
        </div>

        {/* Close button */}
        <div className="flex-shrink-0 px-4 pt-2 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white/70 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
