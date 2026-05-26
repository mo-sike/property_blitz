import React, { useState } from 'react';
import Card from './Card';
import { COLOR_META, SET_SIZES, isCompleteSet, canBeStolen, getPayableCards, RENT_VALUES } from '../utils/cardHelpers';

// Universal modal for choosing targets, colors, and confirming action card plays
export default function ActionModal({ card, gameState, myId, onConfirm, onCancel }) {
  const [targetPlayerId, setTargetPlayerId] = useState(null);
  const [targetCardId, setTargetCardId] = useState(null);
  const [offeredCardId, setOfferedCardId] = useState(null);
  const [targetSetColor, setTargetSetColor] = useState(null);
  const [useDoubleRent, setUseDoubleRent] = useState(false);
  const [destColor, setDestColor] = useState(null);
  const [rentColor, setRentColor] = useState(null);
  const [playAs, setPlayAs] = useState(null); // 'bank' | 'action' | 'property'

  if (!card) return null;

  const myPlayer = gameState.players.find(p => p.id === myId);
  const others = gameState.players.filter(p => p.id !== myId);

  function canBank() {
    return card.type !== 'property';
  }
  function canPlayAsAction() {
    return card.type === 'action' || card.type === 'rent';
  }
  function canPlayAsProperty() {
    return card.type === 'property' || card.type === 'wildProperty';
  }

  // --- Bank: just confirm ---
  if (playAs === 'bank') {
    return (
      <Modal title="Bank Card" onCancel={onCancel}>
        <p className="text-gray-300 mb-4">Add <strong>{cardLabel(card)}</strong> to your bank for <strong>${card.value}M</strong>.</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onConfirm({ cardId: card.id, playAs: 'bank' })}>
            Bank It
          </button>
        </div>
      </Modal>
    );
  }

  // --- Choose how to play ---
  if (!playAs) {
    const choices = [];
    if (canPlayAsProperty(card)) choices.push({ label: 'Place as Property', value: 'property', icon: '🏠' });
    if (canPlayAsAction(card)) choices.push({ label: 'Play as Action', value: 'action', icon: '⚡' });
    if (canBank(card)) choices.push({ label: 'Bank for $' + card.value + 'M', value: 'bank', icon: '💰' });

    if (choices.length === 1) {
      // Auto-select the only option
      setTimeout(() => setPlayAs(choices[0].value), 0);
      return null;
    }

    return (
      <Modal title="How to play this card?" onCancel={onCancel}>
        <div className="flex gap-3 justify-center mb-4">
          <Card card={card} />
        </div>
        <div className="flex flex-col gap-2">
          {choices.map(c => (
            <button key={c.value} className="btn-ghost text-lg py-3" onClick={() => setPlayAs(c.value)}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  // --- Wild property placement ---
  if (playAs === 'property' && card.type === 'wildProperty') {
    const validColors = card.isRainbowWild ? Object.keys(SET_SIZES) : card.colors;
    if (!destColor) {
      return (
        <Modal title="Choose color to place wild in" onCancel={onCancel}>
          <div className="flex flex-wrap gap-2 justify-center my-4">
            {validColors.map(color => {
              const meta = COLOR_META[color];
              return (
                <button
                  key={color}
                  className={`px-4 py-2 rounded-lg font-bold ${meta.bg} ${meta.text} hover:opacity-80`}
                  onClick={() => setDestColor(color)}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <button className="btn-ghost w-full mt-2" onClick={onCancel}>Cancel</button>
        </Modal>
      );
    }
    return (
      <Modal title="Place Wild Property" onCancel={onCancel}>
        <p className="text-gray-300 mb-4">Place in <strong>{COLOR_META[destColor]?.label}</strong> set?</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={() => setDestColor(null)}>Back</button>
          <button className="btn-primary" onClick={() => onConfirm({ cardId: card.id, playAs: 'property', destinationColor: destColor })}>
            Place Property
          </button>
        </div>
      </Modal>
    );
  }

  // --- Regular property ---
  if (playAs === 'property' && card.type === 'property') {
    return (
      <Modal title="Place Property" onCancel={onCancel}>
        <p className="text-gray-300 mb-4">Place <strong>{COLOR_META[card.color]?.label}</strong> property on your board?</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onConfirm({ cardId: card.id, playAs: 'property' })}>
            Place Property
          </button>
        </div>
      </Modal>
    );
  }

  // --- Action: Pass Go ---
  if (playAs === 'action' && card.subtype === 'passGo') {
    return (
      <Modal title="Pass Go" onCancel={onCancel}>
        <p className="text-gray-300 mb-4">Draw 2 extra cards from the deck.</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onConfirm({ cardId: card.id, playAs: 'action' })}>
            Play Pass Go
          </button>
        </div>
      </Modal>
    );
  }

  // --- Action: Double the Rent ---
  if (playAs === 'action' && card.subtype === 'doubleRent') {
    return (
      <Modal title="Double the Rent" onCancel={onCancel}>
        <p className="text-gray-300 mb-4">Your next rent card this turn will be doubled. (Cannot combine with rainbow rent.)</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onConfirm({ cardId: card.id, playAs: 'action' })}>
            Play
          </button>
        </div>
      </Modal>
    );
  }

  // --- Action: House / Hotel ---
  if (playAs === 'action' && (card.subtype === 'house' || card.subtype === 'hotel')) {
    const validSets = Object.keys(SET_SIZES).filter(color => {
      if (color === 'railroad' || color === 'utility') return false;
      if (!isCompleteSet(color, myPlayer)) return false;
      const arr = myPlayer.properties[color] || [];
      if (card.subtype === 'house') return !arr.some(c => c.subtype === 'house');
      return arr.some(c => c.subtype === 'house') && !arr.some(c => c.subtype === 'hotel');
    });
    if (validSets.length === 0) {
      return (
        <Modal title={card.subtype === 'house' ? 'House' : 'Hotel'} onCancel={onCancel}>
          <p className="text-yellow-300">No valid complete sets to place this on.</p>
          <button className="btn-ghost mt-4 w-full" onClick={onCancel}>OK</button>
        </Modal>
      );
    }
    return (
      <Modal title={`Place ${card.subtype === 'house' ? 'House' : 'Hotel'}`} onCancel={onCancel}>
        <p className="text-gray-300 mb-3">Choose which complete set to add to:</p>
        <div className="flex flex-wrap gap-2 justify-center my-3">
          {validSets.map(color => {
            const meta = COLOR_META[color];
            return (
              <button
                key={color}
                className={`px-4 py-2 rounded-lg font-bold ${meta.bg} ${meta.text} hover:opacity-80 ${targetSetColor === color ? 'ring-2 ring-yellow-400' : ''}`}
                onClick={() => setTargetSetColor(color)}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" disabled={!targetSetColor} onClick={() => onConfirm({ cardId: card.id, playAs: 'action', targetSet: targetSetColor })}>
            Place {card.subtype === 'house' ? 'House' : 'Hotel'}
          </button>
        </div>
      </Modal>
    );
  }

  // --- Action: Debt Collector ---
  if (playAs === 'action' && card.subtype === 'debtCollector') {
    return (
      <Modal title="Debt Collector — Choose Target" onCancel={onCancel}>
        <p className="text-gray-300 mb-3">Force one player to pay you <strong>5M</strong>:</p>
        <PlayerList players={others} selected={targetPlayerId} onSelect={setTargetPlayerId} />
        <div className="flex gap-3 justify-end mt-4">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" disabled={!targetPlayerId} onClick={() => onConfirm({ cardId: card.id, playAs: 'action', target: targetPlayerId })}>
            Collect Debt
          </button>
        </div>
      </Modal>
    );
  }

  // --- Action: Birthday ---
  if (playAs === 'action' && card.subtype === 'birthday') {
    return (
      <Modal title="It's My Birthday!" onCancel={onCancel}>
        <p className="text-gray-300 mb-4">All other players each pay you <strong>2M</strong>! 🎂</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-success" onClick={() => onConfirm({ cardId: card.id, playAs: 'action' })}>
            Celebrate!
          </button>
        </div>
      </Modal>
    );
  }

  // --- Action: Sly Deal ---
  if (playAs === 'action' && card.subtype === 'slyDeal') {
    const target = others.find(p => p.id === targetPlayerId);
    const stealableCards = target
      ? Object.values(target.properties).flat().filter(c =>
          (c.type === 'property' || c.type === 'wildProperty') && canBeStolen(c.id, target)
        )
      : [];

    return (
      <Modal title="Sly Deal — Steal a Property" onCancel={onCancel}>
        {!targetPlayerId ? (
          <>
            <p className="text-gray-300 mb-3">Choose a player to steal from:</p>
            <PlayerList players={others} selected={targetPlayerId} onSelect={setTargetPlayerId} showProps />
          </>
        ) : (
          <>
            <p className="text-gray-300 mb-3">
              Steal from <strong>{target?.name}</strong> — choose a property (not from a complete set):
            </p>
            {stealableCards.length === 0 ? (
              <p className="text-yellow-300">No stealable properties.</p>
            ) : (
              <div className="flex flex-wrap gap-2 my-3">
                {stealableCards.map(c => (
                  <Card key={c.id} card={c} small selected={c.id === targetCardId} onClick={() => setTargetCardId(c.id)} />
                ))}
              </div>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <button className="btn-ghost" onClick={() => { setTargetPlayerId(null); setTargetCardId(null); }}>Back</button>
              <button className="btn-danger" disabled={!targetCardId} onClick={() => onConfirm({ cardId: card.id, playAs: 'action', target: targetPlayerId, targetProperty: targetCardId })}>
                Steal It
              </button>
            </div>
          </>
        )}
        {!targetPlayerId && <button className="btn-ghost w-full mt-3" onClick={onCancel}>Cancel</button>}
      </Modal>
    );
  }

  // --- Action: Forced Deal ---
  if (playAs === 'action' && card.subtype === 'forcedDeal') {
    const target = others.find(p => p.id === targetPlayerId);
    const myStealable = Object.values(myPlayer.properties).flat().filter(c =>
      (c.type === 'property' || c.type === 'wildProperty') && canBeStolen(c.id, myPlayer)
    );
    const theirStealable = target
      ? Object.values(target.properties).flat().filter(c =>
          (c.type === 'property' || c.type === 'wildProperty') && canBeStolen(c.id, target)
        )
      : [];

    const myOffered = myStealable.find(c => c.id === offeredCardId);
    const theirTaken = theirStealable.find(c => c.id === targetCardId);

    // Step 1: pick target player
    if (!targetPlayerId) {
      return (
        <Modal title="Forced Deal — Step 1: Choose Player" onCancel={onCancel}>
          <p className="text-gray-300 mb-3">Choose a player to swap with:</p>
          <PlayerList players={others} selected={targetPlayerId} onSelect={setTargetPlayerId} />
          <button className="btn-ghost w-full mt-3" onClick={onCancel}>Cancel</button>
        </Modal>
      );
    }

    // Step 2: pick which of YOUR properties to give
    if (!offeredCardId) {
      return (
        <Modal title="Forced Deal — Step 2: Your Property to Give" onCancel={onCancel}>
          <p className="text-gray-300 mb-3">
            Click a property to offer to <strong>{target?.name}</strong>:
          </p>
          {myStealable.length === 0 ? (
            <p className="text-yellow-300">You have no non-complete-set properties to offer.</p>
          ) : (
            <div className="flex flex-wrap gap-2 my-3">
              {myStealable.map(c => (
                <div key={c.id} className="text-center cursor-pointer" onClick={() => setOfferedCardId(c.id)}>
                  <Card card={c} small />
                  <div className="text-xs text-gray-400 mt-0.5">${c.value}M</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-end mt-3">
            <button className="btn-ghost" onClick={() => setTargetPlayerId(null)}>Back</button>
          </div>
        </Modal>
      );
    }

    // Step 3: pick which of THEIR properties to take
    if (!targetCardId) {
      return (
        <Modal title="Forced Deal — Step 3: Their Property to Take" onCancel={onCancel}>
          <div className="flex items-center gap-2 mb-3 text-sm bg-white/5 rounded-lg px-3 py-2">
            <span className="text-gray-400">You give:</span>
            <Card card={myOffered} small />
          </div>
          <p className="text-gray-300 mb-3">
            Now click a property from <strong>{target?.name}</strong> to take:
          </p>
          {theirStealable.length === 0 ? (
            <p className="text-yellow-300">They have no non-complete-set properties.</p>
          ) : (
            <div className="flex flex-wrap gap-2 my-3">
              {theirStealable.map(c => (
                <div key={c.id} className="text-center cursor-pointer" onClick={() => setTargetCardId(c.id)}>
                  <Card card={c} small />
                  <div className="text-xs text-gray-400 mt-0.5">${c.value}M</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-end mt-3">
            <button className="btn-ghost" onClick={() => setOfferedCardId(null)}>Back</button>
          </div>
        </Modal>
      );
    }

    // Step 4: confirm the swap (both cards selected, no auto-advance issue)
    return (
      <Modal title="Forced Deal — Confirm Swap" onCancel={onCancel}>
        <div className="flex items-center justify-center gap-6 my-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">You give</p>
            <Card card={myOffered} small />
            <p className="text-xs text-white/60 mt-1">${myOffered?.value}M</p>
          </div>
          <span className="text-3xl">⇄</span>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">You get</p>
            <Card card={theirTaken} small />
            <p className="text-xs text-white/60 mt-1">${theirTaken?.value}M</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 text-center mb-4">
          Swap with <strong>{target?.name}</strong> — they can Just Say No.
        </p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={() => setTargetCardId(null)}>Back</button>
          <button className="btn-danger" onClick={() => onConfirm({
            cardId: card.id, playAs: 'action',
            target: targetPlayerId,
            targetProperty: targetCardId,
            offeredProperty: offeredCardId,
          })}>
            Confirm Swap!
          </button>
        </div>
      </Modal>
    );
  }

  // --- Action: Deal Breaker ---
  if (playAs === 'action' && card.subtype === 'dealBreaker') {
    const target = others.find(p => p.id === targetPlayerId);
    const completeSets = target
      ? Object.keys(SET_SIZES).filter(color => isCompleteSet(color, target) && (target.properties[color] || []).length > 0)
      : [];

    return (
      <Modal title="Deal Breaker — Steal a Complete Set" onCancel={onCancel}>
        {!targetPlayerId ? (
          <>
            <p className="text-gray-300 mb-3">Choose a player:</p>
            <PlayerList players={others} selected={targetPlayerId} onSelect={setTargetPlayerId} />
            <button className="btn-ghost w-full mt-3" onClick={onCancel}>Cancel</button>
          </>
        ) : (
          <>
            <p className="text-gray-300 mb-3">Steal a complete set from <strong>{target?.name}</strong>:</p>
            {completeSets.length === 0 ? (
              <p className="text-yellow-300">No complete sets to steal.</p>
            ) : (
              <div className="flex flex-wrap gap-2 my-3">
                {completeSets.map(color => {
                  const meta = COLOR_META[color];
                  return (
                    <button
                      key={color}
                      className={`px-4 py-2 rounded-lg font-bold ${meta.bg} ${meta.text} hover:opacity-80 ${targetSetColor === color ? 'ring-2 ring-yellow-400' : ''}`}
                      onClick={() => setTargetSetColor(color)}
                    >
                      {meta.label} ({(target.properties[color] || []).length} cards)
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <button className="btn-ghost" onClick={() => setTargetPlayerId(null)}>Back</button>
              <button className="btn-danger" disabled={!targetSetColor} onClick={() => onConfirm({ cardId: card.id, playAs: 'action', target: targetPlayerId, targetSet: targetSetColor })}>
                Deal Breaker!
              </button>
            </div>
          </>
        )}
      </Modal>
    );
  }

  // --- Rent cards ---
  if (playAs === 'action' && card.type === 'rent') {
    const validColors = card.subtype === 'rentAny'
      ? Object.keys(SET_SIZES).filter(color => (myPlayer.properties[color] || []).some(c => c.type === 'property' || c.type === 'wildProperty'))
      : card.colors.filter(color => (myPlayer.properties[color] || []).some(c => c.type === 'property' || c.type === 'wildProperty'));

    if (!rentColor) {
      return (
        <Modal title="Choose Rent Color" onCancel={onCancel}>
          <p className="text-gray-300 mb-3">Charge rent for which color?</p>
          {validColors.length === 0 ? (
            <p className="text-yellow-300">You have no properties in valid colors.</p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center my-3">
              {validColors.map(color => {
                const meta = COLOR_META[color];
                const arr = myPlayer.properties[color] || [];
                const rent = arr.length > 0 ? getRentForColor(color, myPlayer) : 0;
                return (
                  <button
                    key={color}
                    className={`px-4 py-2 rounded-lg font-bold ${meta.bg} ${meta.text} hover:opacity-80`}
                    onClick={() => setRentColor(color)}
                  >
                    {meta.label} (${rent}M)
                  </button>
                );
              })}
            </div>
          )}
          <button className="btn-ghost w-full mt-2" onClick={onCancel}>Cancel</button>
        </Modal>
      );
    }

    // Rainbow/multicolor wild rent targets ONE chosen player
    if (card.subtype === 'rentAny' && !targetPlayerId) {
      return (
        <Modal title={`Charge ${COLOR_META[rentColor]?.label} Rent`} onCancel={onCancel}>
          <p className="text-gray-300 mb-3">Choose a player to charge:</p>
          <PlayerList players={others} selected={targetPlayerId} onSelect={setTargetPlayerId} />
          <div className="flex gap-3 justify-end mt-4">
            <button className="btn-ghost" onClick={() => setRentColor(null)}>Back</button>
          </div>
        </Modal>
      );
    }

    // Confirm
    const isAny = card.subtype === 'rentAny';
    const baseRent = getRentForColor(rentColor, myPlayer);
    // presetDouble = doubleRent card was already played as a separate play this turn (not for rainbow)
    const presetDouble = gameState.doubleRentActive && !isAny;
    // canClubDouble = player has a doubleRent card in hand AND enough plays to spend 2 total AND it's not rainbow rent
    const hasDoubleRentCard = !isAny && myPlayer.hand.some(c => c.type === 'action' && c.subtype === 'doubleRent');
    const playsLeft = gameState.playsRemainingThisTurn;
    const canClubDouble = hasDoubleRentCard && !presetDouble && playsLeft >= 2;
    const willDouble = presetDouble || (canClubDouble && useDoubleRent);
    const finalAmount = willDouble ? baseRent * 2 : baseRent;

    return (
      <Modal title="Confirm Rent" onCancel={onCancel}>
        <div className="text-center mb-4">
          <p className="text-gray-300">Charging <strong>{COLOR_META[rentColor]?.label}</strong> rent</p>
          <p className="text-3xl font-bold text-yellow-400">${finalAmount}M</p>
          {willDouble && <p className="text-sm text-yellow-300">✌️ Double Rent applied!</p>}
          {!isAny && <p className="text-sm text-gray-400">All players pay</p>}
          {isAny && <p className="text-sm text-gray-400">From: {others.find(p => p.id === targetPlayerId)?.name}</p>}
        </div>

        {/* Club Double the Rent from hand */}
        {canClubDouble && (
          <label className="flex items-center gap-3 cursor-pointer bg-yellow-400/10 border border-yellow-400/40 rounded-xl px-4 py-3 mb-4 select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-yellow-400"
              checked={useDoubleRent}
              onChange={e => setUseDoubleRent(e.target.checked)}
            />
            <div>
              <div className="font-semibold text-yellow-300">✌️ Use Double the Rent card</div>
              <div className="text-xs text-gray-400">
                Spends 1 extra play — charges ${baseRent * 2}M instead of ${baseRent}M
              </div>
            </div>
          </label>
        )}
        {presetDouble && (
          <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-xl px-4 py-3 mb-4 text-yellow-300 text-sm">
            ✌️ Double the Rent already active from previous play
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={() => { isAny ? setTargetPlayerId(null) : setRentColor(null); setUseDoubleRent(false); }}>Back</button>
          <button className="btn-danger" onClick={() => onConfirm({
            cardId: card.id, playAs: 'action',
            destinationColor: rentColor,
            target: isAny ? targetPlayerId : undefined,
            useDoubleRent: canClubDouble && useDoubleRent,
          })}>
            Charge ${finalAmount}M Rent!
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Play Card" onCancel={onCancel}>
      <p className="text-gray-400">Select an action above.</p>
      <button className="btn-ghost mt-4 w-full" onClick={onCancel}>Cancel</button>
    </Modal>
  );
}

function Modal({ title, children, onCancel }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-bounce-in"
        style={{ background: 'linear-gradient(160deg, #1c1c2e 0%, #12121e 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-xl font-black mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function PlayerList({ players, selected, onSelect, showProps }) {
  return (
    <div className="space-y-2">
      {players.map(p => (
        <button
          key={p.id}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
            selected === p.id
              ? 'border-yellow-400 bg-yellow-400/12 ring-1 ring-yellow-400/60'
              : 'hover:bg-white/10'
          }`}
          style={{ border: selected === p.id ? '1px solid rgba(250,204,21,0.6)' : '1px solid rgba(255,255,255,0.08)', background: selected === p.id ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.04)' }}
          onClick={() => onSelect(p.id)}
        >
          <div className="font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-black">
              {p.name[0].toUpperCase()}
            </span>
            {p.name}
            {selected === p.id && <span className="ml-auto text-yellow-400 text-xs">✓</span>}
          </div>
          {showProps && (
            <div className="text-xs text-gray-400 mt-1 pl-9">
              {Object.entries(p.properties).filter(([, arr]) => arr.length > 0).map(([c, arr]) => `${COLOR_META[c]?.label}(${arr.length})`).join(', ') || 'No properties'}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function cardLabel(card) {
  if (!card) return '';
  if (card.type === 'money') return `$${card.value}M`;
  if (card.type === 'action') return card.subtype;
  return card.type;
}

function getRentForColor(color, player) {
  const arr = player.properties[color] || [];
  const propCount = arr.filter(c => c.type === 'property' || c.type === 'wildProperty').length;
  if (propCount === 0) return 0;
  const table = RENT_VALUES[color] || [];
  const base = table[Math.min(propCount, table.length) - 1] || 0;
  const hasHouse = arr.some(c => c.subtype === 'house');
  const hasHotel = arr.some(c => c.subtype === 'hotel');
  return base + (hasHouse ? 3 : 0) + (hasHotel ? 4 : 0);
}
