import React from 'react';
import { cardDescription, getColorMeta, ACTION_LABELS, RENT_VALUES, SET_SIZES } from '../utils/cardHelpers';

// Card back (draw pile)
function CardBack({ small, onClick }) {
  return (
    <div
      className={`card-base ${small ? 'w-14 h-20' : 'w-24 h-36'} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2340 100%)' }}
      onClick={onClick}
    >
      <div className="h-full flex flex-col items-center justify-center gap-1">
        <span className={small ? 'text-xl' : 'text-3xl'}>🏠</span>
        {!small && <span className="text-xs text-blue-300/60 font-bold tracking-widest">PB</span>}
      </div>
    </div>
  );
}

export default function Card({ card, selected, onClick, small, dimmed, showBack }) {
  if (!card) return null;
  if (showBack) return <CardBack small={small} onClick={onClick} />;

  // Property and wild cards manage their own bg; others use type-based bg
  const outerBg = getOuterBg(card);

  return (
    <div
      title={cardDescription(card)}
      onClick={onClick}
      className={[
        'card-base',
        small ? 'w-14 h-20' : 'w-24 h-36',
        outerBg,
        selected ? 'card-selected' : '',
        dimmed ? 'opacity-40 saturate-50' : '',
        onClick ? 'cursor-pointer' : 'cursor-default',
      ].filter(Boolean).join(' ')}
    >
      {card.isRainbowWild ? (
        <RainbowWildContent card={card} small={small} />
      ) : card.type === 'money' ? (
        <MoneyContent card={card} small={small} />
      ) : card.type === 'property' ? (
        <PropertyContent card={card} small={small} />
      ) : card.type === 'wildProperty' ? (
        <WildContent card={card} small={small} />
      ) : card.type === 'action' ? (
        <ActionContent card={card} small={small} />
      ) : card.type === 'rent' ? (
        <RentContent card={card} small={small} />
      ) : null}
    </div>
  );
}

function getOuterBg(card) {
  if (card.type === 'property' || card.type === 'wildProperty') return '';
  if (card.type === 'money') return 'bg-emerald-800';
  if (card.type === 'action') return 'bg-slate-700';
  if (card.type === 'rent') return card.subtype === 'rentAny' ? '' : 'bg-indigo-800';
  return 'bg-gray-700';
}

// ── Money ─────────────────────────────────────────────────────────────────
function MoneyContent({ card, small }) {
  if (small) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-0.5"
        style={{ background: 'linear-gradient(160deg, #166534 0%, #14532d 100%)' }}>
        <span className="text-xs font-black text-emerald-200">$</span>
        <span className="text-xl font-black text-white leading-none">{card.value}</span>
        <span className="text-xs font-bold text-emerald-300/80">M</span>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 px-2"
      style={{ background: 'linear-gradient(160deg, #166534 0%, #14532d 60%, #0f3d22 100%)' }}>
      <div className="text-xs font-bold text-emerald-400/70 tracking-[0.2em] uppercase">Money</div>
      <div className="flex items-start leading-none">
        <span className="text-lg font-black text-emerald-300 mt-1">$</span>
        <span className="text-5xl font-black text-white">{card.value}</span>
      </div>
      <div className="text-sm font-bold text-emerald-300/80 tracking-widest">MILLION</div>
    </div>
  );
}

// ── Property ──────────────────────────────────────────────────────────────
function PropertyContent({ card, small }) {
  const meta = getColorMeta(card.color);
  const rents = RENT_VALUES[card.color] || [];
  const size = SET_SIZES[card.color] || 0;

  if (small) {
    return (
      <div className="h-full flex flex-col">
        <div className={`${meta.bg} flex items-center justify-center px-1`} style={{ height: '48%' }}>
          <span className={`text-xs font-black text-center leading-tight ${meta.text}`}>
            {meta.label}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5"
          style={{ background: '#fef9ed' }}>
          <span className="text-xs font-bold text-gray-600">${card.value}M</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Color band */}
      <div className={`${meta.bg} flex items-center justify-center px-2`} style={{ height: '38%' }}>
        <span className={`font-black text-sm text-center leading-tight ${meta.text}`}>
          {meta.label}
        </span>
      </div>
      {/* Cream rent table */}
      <div className="flex-1 flex flex-col justify-between px-2 py-1.5"
        style={{ background: '#fef9ed', color: '#374151' }}>
        <div className="space-y-0.5">
          {rents.map((r, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span style={{ color: '#9ca3af' }}>{i + 1}×</span>
              <span className="font-bold" style={{ color: '#1f2937' }}>${r}M</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: '#9ca3af' }}>/{size}</span>
          <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>${card.value}M</span>
        </div>
      </div>
    </div>
  );
}

// ── Wild Property (dual color) ────────────────────────────────────────────
function WildContent({ card, small }) {
  const [colorA, colorB] = card.colors;
  const metaA = getColorMeta(colorA);
  const metaB = getColorMeta(colorB);

  if (small) {
    return (
      <div className="h-full flex flex-col">
        <div className={`${metaA.bg} flex-1 flex items-center justify-center`}>
          <span className={`text-xs font-black ${metaA.text}`}>
            {metaA.label.split(' ')[0]}
          </span>
        </div>
        <div className={`${metaB.bg} flex-1 flex items-center justify-center`}>
          <span className={`text-xs font-black ${metaB.text}`}>
            {metaB.label.split(' ')[0]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className={`${metaA.bg} flex-1 flex items-center justify-center`}>
        <span className={`font-bold text-sm ${metaA.text}`}>{metaA.label}</span>
      </div>
      {/* Center WILD badge */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 pointer-events-none">
        <span className="bg-white text-gray-800 text-xs font-black px-2 py-0.5 rounded-full shadow-lg tracking-wide">
          WILD
        </span>
      </div>
      <div className={`${metaB.bg} flex-1 flex items-center justify-between px-2`}>
        <span className={`font-bold text-sm ${metaB.text}`}>{metaB.label}</span>
        {card.value > 0 && (
          <span className={`text-xs font-semibold ${metaB.text} opacity-75`}>${card.value}M</span>
        )}
      </div>
    </div>
  );
}

// ── Rainbow Wild ──────────────────────────────────────────────────────────
function RainbowWildContent({ card, small }) {
  const rainbow = 'linear-gradient(135deg, #ef4444 0%, #f97316 18%, #eab308 36%, #22c55e 54%, #3b82f6 72%, #8b5cf6 90%)';
  if (small) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: rainbow }}>
        <span className="text-2xl drop-shadow-lg filter">🌈</span>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col items-center justify-center gap-1.5" style={{ background: rainbow }}>
      <span className="text-4xl drop-shadow-lg">🌈</span>
      <span className="text-white font-black text-xs tracking-widest drop-shadow">ANY COLOR</span>
      <span className="text-white/70 text-xs">Wild Property</span>
    </div>
  );
}

// ── Action ────────────────────────────────────────────────────────────────
const ACTION_ICONS = {
  passGo: '🚶', dealBreaker: '💣', forcedDeal: '🔄', slyDeal: '🤫',
  justSayNo: '🚫', debtCollector: '💰', birthday: '🎂', doubleRent: '✌️',
  house: '🏠', hotel: '🏨',
};

const ACTION_BG = {
  passGo:       'linear-gradient(160deg, #ea580c 0%, #c2410c 100%)',
  dealBreaker:  'linear-gradient(160deg, #991b1b 0%, #7f1d1d 100%)',
  forcedDeal:   'linear-gradient(160deg, #92400e 0%, #78350f 100%)',
  slyDeal:      'linear-gradient(160deg, #6d28d9 0%, #4c1d95 100%)',
  justSayNo:    'linear-gradient(160deg, #b91c1c 0%, #991b1b 100%)',
  debtCollector:'linear-gradient(160deg, #a16207 0%, #854d0e 100%)',
  birthday:     'linear-gradient(160deg, #9d174d 0%, #831843 100%)',
  doubleRent:   'linear-gradient(160deg, #a16207 0%, #7c5617 100%)',
  house:        'linear-gradient(160deg, #15803d 0%, #14532d 100%)',
  hotel:        'linear-gradient(160deg, #065f46 0%, #064e3b 100%)',
};

function ActionContent({ card, small }) {
  const label = ACTION_LABELS[card.subtype] || card.subtype;
  const icon = ACTION_ICONS[card.subtype] || '⚡';
  const bg = ACTION_BG[card.subtype] || 'linear-gradient(160deg, #374151 0%, #1f2937 100%)';

  if (small) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1" style={{ background: bg }}>
        <span className="text-xl">{icon}</span>
        <div className="text-xs font-bold text-white/90 text-center leading-tight px-0.5">
          {label.split(' ').slice(0, 2).join('\n')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-between p-2" style={{ background: bg }}>
      <div className="text-xs text-white/40 tracking-[0.18em] font-semibold">ACTION</div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl drop-shadow">{icon}</span>
        <div className="font-black text-white text-xs text-center leading-tight tracking-wide">
          {label.toUpperCase()}
        </div>
      </div>
      <div className="text-xs text-white/40 font-medium">${card.value}M bank</div>
    </div>
  );
}

// ── Rent ──────────────────────────────────────────────────────────────────
function RentContent({ card, small }) {
  const isAny = card.subtype === 'rentAny';

  if (small) {
    if (isAny) {
      const rainbow = 'linear-gradient(135deg, #ef4444 0%, #eab308 40%, #3b82f6 80%, #8b5cf6 100%)';
      return (
        <div className="h-full flex flex-col items-center justify-center gap-0.5" style={{ background: rainbow }}>
          <span className="text-lg">💸</span>
          <div className="text-xs font-black text-white drop-shadow">RENT</div>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1"
        style={{ background: 'linear-gradient(160deg, #3730a3 0%, #1e1b4b 100%)' }}>
        <span className="text-lg">🏦</span>
        <div className="flex flex-col gap-0.5 items-center">
          {card.colors.map(c => {
            const meta = getColorMeta(c);
            return (
              <span key={c} className={`text-xs px-1 rounded font-bold leading-tight ${meta.bg} ${meta.text}`}>
                {meta.label.split(' ')[0]}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (isAny) {
    const rainbow = 'linear-gradient(135deg, #ef4444 0%, #f97316 20%, #eab308 40%, #22c55e 55%, #3b82f6 75%, #8b5cf6 100%)';
    return (
      <div className="h-full flex flex-col items-center justify-between p-2" style={{ background: rainbow }}>
        <div className="text-xs text-white/70 font-black tracking-widest drop-shadow">RENT</div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl drop-shadow">💸</span>
          <div className="font-black text-white text-xs text-center drop-shadow tracking-wide">RAINBOW</div>
          <div className="text-xs text-white/80 text-center drop-shadow">Any color • 1 player</div>
        </div>
        <div className="text-xs text-white/60 drop-shadow font-medium">${card.value}M bank</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-between p-2"
      style={{ background: 'linear-gradient(160deg, #3730a3 0%, #1e1b4b 100%)' }}>
      <div className="text-xs text-indigo-300/70 font-semibold tracking-widest">RENT</div>
      <div className="flex flex-col items-center gap-2 w-full">
        <span className="text-2xl">🏦</span>
        <div className="flex flex-col gap-1 w-full">
          {card.colors.map(c => {
            const meta = getColorMeta(c);
            return (
              <span key={c} className={`text-xs px-2 py-0.5 rounded-full font-bold text-center ${meta.bg} ${meta.text}`}>
                {meta.label}
              </span>
            );
          })}
        </div>
        <div className="text-xs text-indigo-300/60 text-center">All players pay</div>
      </div>
      <div className="text-xs text-indigo-300/50 font-medium">${card.value}M bank</div>
    </div>
  );
}
