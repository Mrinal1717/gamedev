import React from 'react';
import { Player, PlayerColor } from '@/lib/ludoEngine';
import { Copy, Check, Users, Shield, Play } from 'lucide-react';

interface LobbyProps {
  roomCode: string;
  players: Player[];
  currentPlayerId: string;
  onUpdateReady: (ready: boolean) => void;
  onSelectColor: (color: PlayerColor) => void;
  onStartGame: () => void;
  isHost: boolean;
}

export default function Lobby({
  roomCode,
  players,
  currentPlayerId,
  onUpdateReady,
  onSelectColor,
  onStartGame,
  isHost,
}: LobbyProps) {
  const [copied, setCopied] = React.useState(false);

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const selectedColor = currentPlayer?.color;
  const isReady = currentPlayer?.is_ready || false;

  const copyRoomLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/room/${roomCode}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const colors: { name: PlayerColor; hex: string; shadow: string }[] = [
    { name: 'red', hex: 'var(--neon-red)', shadow: 'var(--neon-red-glow)' },
    { name: 'green', hex: 'var(--neon-green)', shadow: 'var(--neon-green-glow)' },
    { name: 'yellow', hex: 'var(--neon-yellow)', shadow: 'var(--neon-yellow-glow)' },
    { name: 'blue', hex: 'var(--neon-blue)', shadow: 'var(--neon-blue-glow)' },
  ];

  // Find who has taken each color
  const colorAssignments = React.useMemo(() => {
    const map: Record<PlayerColor, Player | null> = {
      red: null,
      green: null,
      yellow: null,
      blue: null,
    };
    players.forEach((p) => {
      if (p.color) {
        map[p.color] = p;
      }
    });
    return map;
  }, [players]);

  const allPlayersReady = players.length >= 2 && players.every((p) => p.is_ready);

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel-glow p-8 flex flex-col gap-8 md:gap-10">
      {/* Header & Share Link */}
      <div className="flex flex-col gap-3 text-center border-b border-purple-500/10 pb-6">
        <h1 className="text-3xl font-extrabold neon-title text-purple-400">GAME LOBBY</h1>
        <p className="text-secondary text-sm">Share this code or link with your friends to play together!</p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-lg font-mono tracking-widest text-white font-bold">
            ROOM: {roomCode}
          </div>
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-purple-900/40 border border-purple-500/30 text-purple-200 hover:bg-purple-800/50 hover:text-white transition-all"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copied ? 'Copied Link!' : 'Copy Invite Link'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Players List */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-purple-300 font-mono">
            <Users size={20} />
            PLAYERS ({players.length}/4)
          </h2>
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
            {players.map((player) => {
              const colorDetails = colors.find((c) => c.name === player.color);
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    {player.color ? (
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: colorDetails?.hex,
                          boxShadow: `0 0 8px ${colorDetails?.shadow}`,
                        }}
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-dashed border-white/30" />
                    )}
                    <span className="font-semibold text-white truncate max-w-[150px]">
                      {player.name} {player.id === currentPlayerId && <span className="text-xs text-purple-400 font-mono">(You)</span>}
                    </span>
                    {player.is_host && <span title="Host"><Shield size={14} className="text-amber-400" /></span>}
                  </div>
                  <div>
                    {player.is_ready ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                        READY
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold font-mono">
                        WAITING
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Color Picker & Ready State */}
        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-bold text-purple-300 font-mono">CHOOSE YOUR COLOR</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {colors.map((color) => {
              const assignedPlayer = colorAssignments[color.name];
              const isTaken = assignedPlayer !== null;
              const isMine = assignedPlayer?.id === currentPlayerId;

              return (
                <button
                  key={color.name}
                  disabled={isTaken && !isMine}
                  onClick={() => onSelectColor(color.name)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${
                    isMine
                      ? 'bg-purple-500/10 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                      : isTaken
                      ? 'opacity-40 bg-black/20 border-white/5 cursor-not-allowed'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full mb-2"
                    style={{
                      backgroundColor: color.hex,
                      boxShadow: `0 0 12px ${color.shadow}`,
                    }}
                  />
                  <span className="text-sm font-semibold capitalize text-white">{color.name}</span>
                  {assignedPlayer && (
                    <span className="text-[10px] text-secondary truncate max-w-[80px] mt-1 font-mono">
                      {isMine ? 'You' : assignedPlayer.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-purple-500/10 pt-5 flex items-center justify-between">
            <span className="text-secondary text-sm font-medium">Ready status</span>
            <button
              onClick={() => onUpdateReady(!isReady)}
              className={`px-6 py-2 rounded-lg font-bold font-mono transition-all text-sm ${
                isReady
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-purple-900/40 hover:bg-purple-800/40 text-purple-200 border border-purple-500/30'
              }`}
            >
              {isReady ? 'I\'M READY' : 'MARK READY'}
            </button>
          </div>
        </div>
      </div>

      {/* Start Button (For Host only) */}
      {isHost && (
        <div className="border-t border-purple-500/10 pt-6 flex flex-col items-center gap-3">
          <button
            onClick={onStartGame}
            disabled={!allPlayersReady}
            className="glass-button w-full py-4 text-lg font-bold tracking-widest flex items-center justify-center gap-3 disabled:opacity-40"
          >
            <Play size={20} fill="#fff" />
            START GAME
          </button>
          {!allPlayersReady && (
            <p className="text-xs text-amber-400 font-mono text-center">
              * Requires at least 2 players, and all players must be marked READY.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
