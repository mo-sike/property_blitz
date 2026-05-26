import React, { useState, useEffect } from 'react';
import Hand from './Hand';
import PlayerArea from './PlayerArea';
import Card from './Card';
import ActionModal from './ActionModal';
import JustSayNoPrompt from './JustSayNoPrompt';
import PaymentModal from './PaymentModal';
import WildReassignModal from './WildReassignModal';
import Leaderboard from './Leaderboard';
import { canBeStolen, isCompleteSet, SET_SIZES, COLOR_META, RENT_VALUES, getCompleteSets, getBankTotal } from '../utils/cardHelpers';

export default function Board({ state, actions }) {
  const { gameState, myId, actionPrompt, errorMessage } = state;
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [wildToMove, setWildToMove] = useState(null); // { card, fromColor }
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  if (!gameState) return null;

  const gs = gameState;
  const myPlayer = gs.players.find(p => p.id === myId);
  const others = gs.players.filter(p => p.id !== myId);
  const currentPlayer = gs.players[gs.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId;
  const pa = gs.pendingAction;

  const iAmResponder = pa && pa.currentResponderId === myId;
  const iAmPaymentTarget = pa && pa.phase === 'payment' && pa.currentResponderId === myId;
  const showJsnPrompt = pa && pa.phase === 'jsnWindow' && (iAmResponder || pa.fromPlayerId === myId);
  const showPayment = iAmPaymentTarget;

  function handleCardClick(card) {
    if (!isMyTurn || !gs.hasDrawnThisTurn || pa || gs.playsRemainingThisTurn <= 0) return;
    if (selectedCard?.id === card.id) {
      setSelectedCard(null); setShowModal(false);
    } else {
      setSelectedCard(card); setShowModal(true);
    }
  }

  function handleModalConfirm(payload) {
    actions.playCard(payload);
    setSelectedCard(null); setShowModal(false);
  }

  function handleModalCancel() {
    setSelectedCard(null); setShowModal(false);
  }

  function handleWildClick(card, fromColor) {
    setWildToMove({ card, fromColor });
  }

  function handleWildMove(newColor) {
    actions.reassignWild(wildToMove.card.id, newColor);
    setWildToMove(null);
  }

  function handleDiscard() {
    if (!myPlayer) return;
    const excess = myPlayer.hand.length - 7;
    if (excess <= 0) return;
    const sorted = [...myPlayer.hand].sort((a, b) => (a.value || 0) - (b.value || 0));
    actions.discardCards(sorted.slice(0, excess).map(c => c.id));
  }

  const needsDiscard = isMyTurn && myPlayer && myPlayer.hand.length > 7;
  const canEndTurn = isMyTurn && gs.hasDrawnThisTurn && !pa && !needsDiscard;
  const autoEndActive = canEndTurn && gs.playsRemainingThisTurn === 0;

  const [autoEndSecsLeft, setAutoEndSecsLeft] = useState(null);

  useEffect(() => {
    if (!autoEndActive) {
      setAutoEndSecsLeft(null);
      return;
    }
    setAutoEndSecsLeft(30);
    const interval = setInterval(() => {
      setAutoEndSecsLeft(t => {
        if (t <= 1) { clearInterval(interval); actions.endTurn(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoEndActive]);

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="font-black text-lg tracking-tight"
          style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🏠 Property Blitz
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Room</span>
          <span className="font-mono font-black text-white tracking-widest bg-white/10 px-2 py-0.5 rounded-lg">{gs.roomCode}</span>
        </div>

        {myPlayer && <WinProgress player={myPlayer} />}

        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500 text-xs">🎴 {gs.drawPileCount}</span>
          {gs.doubleRentActive && (
            <span className="font-bold text-yellow-300 bg-yellow-400/15 px-2 py-0.5 rounded-lg text-xs animate-pulse-slow">
              ✌️ DBL RENT
            </span>
          )}
          {isMyTurn && !pa && (
            <span className="font-bold text-green-300 bg-green-400/15 px-2 py-0.5 rounded-lg text-xs animate-pulse-slow">
              Your Turn
            </span>
          )}
        </div>
      </div>

      {/* ── Opponents ───────────────────────────────────────────────────── */}
      {others.length > 0 && (
        <div className="flex-shrink-0 px-3 pt-3 pb-1 overflow-x-auto thin-scroll">
          <div className="flex gap-3 min-w-max">
            {others.map(p => (
              <div key={p.id} className="w-72 flex-shrink-0">
                <PlayerArea
                  player={p}
                  isMe={false}
                  isCurrent={gs.players[gs.currentPlayerIndex]?.id === p.id}
                  isWinner={gs.winner === p.id}
                  small
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Center: draw / status / discard ─────────────────────────────── */}
      <div className="flex items-center justify-center gap-6 py-4 flex-shrink-0">

        {/* Draw pile */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative cursor-pointer group"
            onClick={isMyTurn && !gs.hasDrawnThisTurn && !pa ? actions.drawCards : undefined}>
            <div className="absolute top-1 left-1 w-24 h-36 rounded-xl opacity-40"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#0f2340)', border: '2px solid rgba(255,255,255,0.08)' }} />
            <div className="absolute top-0.5 left-0.5 w-24 h-36 rounded-xl opacity-60"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#0f2340)', border: '2px solid rgba(255,255,255,0.1)' }} />
            <div className={`relative w-24 h-36 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all
              ${isMyTurn && !gs.hasDrawnThisTurn && !pa
                ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent group-hover:-translate-y-1'
                : ''}`}
              style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2340 100%)', border: '2px solid rgba(255,255,255,0.22)' }}>
              <span className="text-3xl">🎴</span>
              <span className="text-xs font-bold text-blue-300">{gs.drawPileCount}</span>
              {isMyTurn && !gs.hasDrawnThisTurn && !pa && (
                <span className="text-xs text-yellow-300 animate-pulse font-semibold">Draw!</span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500">Draw pile</p>
        </div>

        {/* Turn status */}
        <div className="flex flex-col items-center gap-2 min-w-[140px]">
          <div className={`px-4 py-2.5 rounded-2xl text-sm font-bold text-center transition-all ${
            isMyTurn ? 'text-green-300' : 'text-gray-300'
          }`}
            style={{
              background: isMyTurn ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isMyTurn ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
            }}>
            {isMyTurn
              ? gs.hasDrawnThisTurn
                ? `${gs.playsRemainingThisTurn} play${gs.playsRemainingThisTurn !== 1 ? 's' : ''} left`
                : '← Draw cards'
              : `${currentPlayer?.name}'s turn`}
          </div>

          {canEndTurn && (
            <button className="btn-success w-full text-sm" onClick={actions.endTurn}>
              End Turn ✓
            </button>
          )}
          {autoEndSecsLeft !== null && (
            <div className="text-xs text-center text-gray-400">
              Auto-ending in <span className={`font-bold tabular-nums ${autoEndSecsLeft <= 10 ? 'text-red-400' : 'text-yellow-300'}`}>{autoEndSecsLeft}s</span>
            </div>
          )}
          {needsDiscard && (
            <button className="btn-danger w-full text-sm" onClick={handleDiscard}>
              Discard {myPlayer.hand.length - 7} card{myPlayer.hand.length - 7 !== 1 ? 's' : ''}
            </button>
          )}
          {pa && (
            <div className="text-xs text-yellow-300/80 text-center bg-yellow-400/10 px-3 py-1.5 rounded-xl border border-yellow-400/20">
              ⏳ {pa.type} pending…
            </div>
          )}

          {/* End Game */}
          {!pa && !gs.winner && (
            <div className="flex items-center justify-center gap-2 mt-1">
              {!showEndConfirm ? (
                <button
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                  onClick={() => setShowEndConfirm(true)}
                >
                  End Game
                </button>
              ) : (
                <>
                  <button
                    className="text-xs font-semibold text-white bg-red-600 hover:bg-red-500 px-3 py-1 rounded-lg transition-colors"
                    onClick={() => { actions.endGame(); setShowEndConfirm(false); }}
                  >
                    Confirm End
                  </button>
                  <button
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                    onClick={() => setShowEndConfirm(false)}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Discard pile */}
        <div className="flex flex-col items-center gap-1.5">
          {gs.discardPile?.length > 0 ? (
            <Card card={gs.discardPile[gs.discardPile.length - 1]} small />
          ) : (
            <div className="w-14 h-20 rounded-xl flex items-center justify-center"
              style={{ border: '2px dashed rgba(255,255,255,0.12)' }}>
              <span className="text-xs text-gray-600">—</span>
            </div>
          )}
          <p className="text-xs text-gray-500">Discard</p>
        </div>
      </div>

      {/* ── My properties ───────────────────────────────────────────────── */}
      {myPlayer && (
        <div className="flex-shrink-0 px-3 pb-2">
          <PlayerArea
            player={myPlayer}
            isMe
            isCurrent={isMyTurn}
            isWinner={gs.winner === myId}
            onWildClick={isMyTurn && !pa ? handleWildClick : undefined}
          />
        </div>
      )}

      {/* ── My hand ─────────────────────────────────────────────────────── */}
      {myPlayer && (
        <div className="flex-shrink-0 pt-3 pb-5 px-3"
          style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-semibold text-gray-300">
              Hand
              <span className="ml-1.5 text-xs text-gray-500 font-normal">({myPlayer.hand.length} cards)</span>
            </span>
            {selectedCard && (
              <button className="text-xs text-gray-400 hover:text-white underline transition-colors" onClick={handleModalCancel}>
                Deselect
              </button>
            )}
            {!isMyTurn && (
              <span className="text-xs text-gray-500 italic">Waiting for your turn…</span>
            )}
            {isMyTurn && !gs.hasDrawnThisTurn && (
              <span className="text-xs text-yellow-300/70">Draw first</span>
            )}
          </div>
          <Hand
            cards={myPlayer.hand}
            selectedCardId={selectedCard?.id}
            onCardClick={handleCardClick}
            disabled={!isMyTurn || !gs.hasDrawnThisTurn || !!pa || gs.playsRemainingThisTurn <= 0}
          />
        </div>
      )}

      {/* ── Leaderboard / Game Over overlay ─────────────────────────────── */}
      {state.leaderboard && (
        <Leaderboard
          leaderboard={state.leaderboard}
          reason={state.gameOverReason}
          myId={myId}
          onPlayAgain={() => window.location.reload()}
        />
      )}

      {/* Modals */}
      {showJsnPrompt && !showPayment && (
        <JustSayNoPrompt
          prompt={pa}
          myId={myId}
          myHand={myPlayer?.hand}
          onJustSayNo={actions.justSayNo}
          onAccept={actions.acceptAction}
        />
      )}
      {showPayment && myPlayer && (
        <PaymentModal
          prompt={pa}
          myPlayer={myPlayer}
          onPay={actions.payDebt}
        />
      )}
      {showModal && selectedCard && myPlayer && (
        <ActionModal
          card={selectedCard}
          gameState={gs}
          myId={myId}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}

      {wildToMove && myPlayer && (
        <WildReassignModal
          card={wildToMove.card}
          fromColor={wildToMove.fromColor}
          playerProperties={myPlayer.properties}
          onMove={handleWildMove}
          onCancel={() => setWildToMove(null)}
        />
      )}

      {/* Move log */}
      <MoveLog moves={gs.moveLog || []} />

      {/* Error toast */}
      {errorMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-semibold animate-bounce-in"
          style={{ background: 'rgba(220,38,38,0.95)', backdropFilter: 'blur(8px)' }}>
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
}

function WinProgress({ player }) {
  const sets = getCompleteSets(player).length;
  const bank = getBankTotal(player);
  const setsOk = sets >= 3;
  const bankOk = bank >= 10;
  const setsPercent = Math.min(sets / 3, 1) * 100;
  const bankPercent = Math.min(bank / 10, 1) * 100;
  return (
    <div className="flex items-center gap-3">
      <ProgressPill label="Sets" value={sets} max={3} percent={setsPercent} done={setsOk} unit="" />
      <ProgressPill label="Bank" value={`$${bank}M`} max="$10M" percent={bankPercent} done={bankOk} unit="" />
      {setsOk && bankOk && (
        <span className="text-xs font-bold text-yellow-300 animate-pulse-slow">🏆 Win!</span>
      )}
    </div>
  );
}

function ProgressPill({ label, value, max, percent, done }) {
  return (
    <div className={`flex flex-col gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors ${done ? 'bg-yellow-400/15 border border-yellow-400/30' : 'bg-white/5 border border-white/10'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={done ? 'text-yellow-300' : 'text-gray-400'}>{label}</span>
        <span className={`font-bold ${done ? 'text-yellow-300' : 'text-white'}`}>
          {done ? '✓' : `${value}/${max}`}
        </span>
      </div>
      <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-yellow-400' : 'bg-blue-400'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function formatRelTime(ts) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 5) return 'now';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m`;
}

function MoveLog({ moves }) {
  const [open, setOpen] = useState(true);
  const visible = [...moves].reverse().slice(0, 8);

  return (
    <div className="fixed bottom-4 right-4 z-40 w-60 select-none">
      <button
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
        style={{
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: open ? '0.75rem 0.75rem 0 0' : '0.75rem',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-gray-300 font-semibold">Moves</span>
        <span className="text-gray-500 tabular-nums">{open ? '▾' : '▸'} {moves.length}</span>
      </button>
      {open && (
        <div style={{
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderTop: 'none',
          borderRadius: '0 0 0.75rem 0.75rem',
        }}>
          {visible.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-gray-600 italic">No moves yet</div>
          ) : (
            <div className="max-h-44 overflow-y-auto thin-scroll divide-y divide-white/5">
              {visible.map((m, i) => (
                <div key={i} className="px-3 py-1.5 flex items-start gap-2">
                  <span className="text-gray-200 text-xs leading-relaxed flex-1">{m.text}</span>
                  <span className="text-gray-600 text-[10px] pt-0.5 shrink-0 tabular-nums">{formatRelTime(m.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
