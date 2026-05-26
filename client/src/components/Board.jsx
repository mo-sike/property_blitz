import React, { useState, useEffect, useRef } from 'react';
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
  const { gameState, myId, actionPrompt, errorMessage, chatMessages = [] } = state;
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
        <div className="flex-shrink-0 pt-3 pb-[228px] sm:pb-5 px-3"
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

      {/* Move log + Chat sidebar */}
      <GameSidebar
        moves={gs.moveLog || []}
        chatMessages={chatMessages}
        myId={myId}
        onSendChat={actions.sendChat}
      />

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

// ── Tabbed Moves + Chat sidebar ─────────────────────────────────────────────
// Desktop: fixed bottom-right floating panel (w-64)
// Mobile (≤640px): fixed bottom bar, full width, above nothing (sits above the
//   error toast layer). Collapses to a slim 36px pill.

const PANEL_GLASS = {
  background: 'rgba(10,10,20,0.82)',
  backdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.10)',
};

function GameSidebar({ moves, chatMessages, myId, onSendChat }) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState('moves'); // 'moves' | 'chat'
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const chatEndRef = useRef(null);
  const prevChatLen = useRef(chatMessages.length);

  // Track unread chat badges when on the moves tab
  useEffect(() => {
    if (chatMessages.length > prevChatLen.current) {
      if (tab !== 'chat' || !open) {
        setUnreadChat(u => u + (chatMessages.length - prevChatLen.current));
      }
    }
    prevChatLen.current = chatMessages.length;
  }, [chatMessages.length, tab, open]);

  // Clear badge when chat tab becomes active
  useEffect(() => {
    if (tab === 'chat' && open) setUnreadChat(0);
  }, [tab, open]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (tab === 'chat' && open) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, tab, open]);

  function sendChat(e) {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt) return;
    onSendChat(txt);
    setChatInput('');
  }

  const moveItems = [...moves].reverse().slice(0, 10);

  // Colour-coded chat bubbles: mine on the right, others on the left
  function ChatBubble({ msg }) {
    const isMe = msg.playerId === myId;
    return (
      <div className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="text-[10px] text-gray-500 px-1">{msg.playerName}</span>
        )}
        <div className={`max-w-[85%] px-2.5 py-1.5 rounded-2xl text-xs leading-snug ${
          isMe
            ? 'bg-blue-600/80 text-white rounded-br-sm'
            : 'bg-white/10 text-gray-200 rounded-bl-sm'
        }`}>
          {msg.text}
        </div>
        <span className="text-[9px] text-gray-600 px-1">{formatRelTime(msg.ts)}</span>
      </div>
    );
  }

  // ── Positioning: full-width on mobile, fixed corner on desktop
  const wrapperClass = [
    'fixed z-40 select-none',
    // mobile: bottom bar, full width, sits at very bottom
    'bottom-0 left-0 right-0',
    // desktop: right corner, fixed width, slightly inset
    'sm:bottom-4 sm:left-auto sm:right-4 sm:w-64',
  ].join(' ');

  const headerRadius = open
    ? 'rounded-t-2xl sm:rounded-t-xl'
    : 'rounded-2xl sm:rounded-xl';

  return (
    <div className={wrapperClass}>
      {/* ── Header / toggle row ── */}
      <button
        className={`w-full flex items-center justify-between px-3 py-2 transition-colors hover:bg-white/5 ${headerRadius}`}
        style={PANEL_GLASS}
        onClick={() => setOpen(o => !o)}
      >
        {/* Tab switchers (also act as toggle-open if closed) */}
        <div className="flex items-center gap-1" onClick={e => { e.stopPropagation(); if (!open) setOpen(true); }}>
          <TabPill
            label="Moves"
            active={tab === 'moves'}
            onClick={e => { e.stopPropagation(); setTab('moves'); setOpen(true); }}
          />
          <TabPill
            label="Chat"
            active={tab === 'chat'}
            badge={unreadChat}
            onClick={e => { e.stopPropagation(); setTab('chat'); setOpen(true); setUnreadChat(0); }}
          />
        </div>
        <span className="text-gray-500 text-xs pr-0.5">{open ? '▾' : '▸'}</span>
      </button>

      {/* ── Panel body ── */}
      {open && (
        <div
          className="border-t-0 rounded-b-none sm:rounded-b-xl overflow-hidden"
          style={{ ...PANEL_GLASS, borderTop: 'none' }}
        >
          {/* Moves tab */}
          {tab === 'moves' && (
            <div className="max-h-44 overflow-y-auto thin-scroll divide-y divide-white/5">
              {moveItems.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-600 italic">No moves yet</div>
              ) : moveItems.map((m, i) => (
                <div key={i} className="px-3 py-1.5 flex items-start gap-2">
                  <span className="text-gray-200 text-xs leading-relaxed flex-1">{m.text}</span>
                  <span className="text-gray-600 text-[10px] pt-0.5 shrink-0 tabular-nums">{formatRelTime(m.ts)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chat tab */}
          {tab === 'chat' && (
            <div className="flex flex-col" style={{ height: '180px' }}>
              {/* Message list */}
              <div className="flex-1 overflow-y-auto thin-scroll px-3 py-2 flex flex-col gap-1.5">
                {chatMessages.length === 0 ? (
                  <div className="text-xs text-gray-600 italic mt-auto pb-1">No messages yet — say hi! 👋</div>
                ) : (
                  chatMessages.map((msg, i) => <ChatBubble key={i} msg={msg} />)
                )}
                <div ref={chatEndRef} />
              </div>
              {/* Input */}
              <form onSubmit={sendChat}
                className="flex items-center gap-1.5 px-2 py-1.5 border-t border-white/8">
                <input
                  className="flex-1 bg-white/8 text-white text-xs px-2.5 py-1.5 rounded-xl outline-none placeholder-gray-600 focus:bg-white/12 transition-colors"
                  style={{ minWidth: 0, border: '1px solid rgba(255,255,255,0.10)' }}
                  placeholder="Type a message…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  maxLength={200}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30"
                  style={{ background: chatInput.trim() ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.06)' }}
                >
                  <span className="text-xs">↑</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabPill({ label, active, badge, onClick }) {
  return (
    <button
      className="relative px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-colors"
      style={{
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: active ? 'white' : 'rgba(156,163,175,1)',
      }}
      onClick={onClick}
    >
      {label}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
