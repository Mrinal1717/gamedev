'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Dice5, Gamepad2, Plus, LogIn } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = React.useState('');
  const [roomCodeInput, setRoomCodeInput] = React.useState('');
  const [playerId, setPlayerId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Retrieve or generate persistent playerId on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      let storedId = localStorage.getItem('ludo_player_id');
      if (!storedId) {
        storedId = crypto.randomUUID();
        localStorage.setItem('ludo_player_id', storedId);
      }
      setPlayerId(storedId);

      const storedName = localStorage.getItem('ludo_nickname');
      if (storedName) {
        setNickname(storedName);
      }
    }
  }, []);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter a nickname.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      localStorage.setItem('ludo_nickname', nickname.trim());
      const roomCode = generateRoomCode();

      const hostPlayer = {
        id: playerId,
        name: nickname.trim(),
        color: 'red', // Host defaults to Red
        is_ready: true,
        is_host: true,
      };

      const newRoom = {
        room_code: roomCode,
        status: 'waiting',
        host_id: playerId,
        players: [hostPlayer],
        current_turn: 0,
        game_state: {
          board_state: { red: [0, 0, 0, 0], green: [0, 0, 0, 0], yellow: [0, 0, 0, 0], blue: [0, 0, 0, 0] },
          dice_value: null,
          dice_state: 'idle',
          rolls_left_for_six: 1,
          winner: null,
          consecutive_sixes: 0,
          winners: []
        },
      };

      const { data, error: dbError } = await supabase
        .from('ludo_rooms')
        .insert([newRoom])
        .select()
        .single();

      if (dbError) throw dbError;

      router.push(`/room/${roomCode}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter a nickname.');
      return;
    }
    if (!roomCodeInput.trim()) {
      setError('Please enter a room code.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      localStorage.setItem('ludo_nickname', nickname.trim());
      const code = roomCodeInput.trim().toUpperCase();

      // Fetch the room
      const { data: room, error: fetchError } = await supabase
        .from('ludo_rooms')
        .select('*')
        .eq('room_code', code)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!room) {
        setError('Room not found. Check the code.');
        setLoading(false);
        return;
      }

      if (room.status !== 'waiting') {
        setError('Game is already in progress or finished.');
        setLoading(false);
        return;
      }

      const players = room.players as any[];
      
      // Check if player is already in this room
      const existingPlayer = players.find((p) => p.id === playerId);
      if (existingPlayer) {
        router.push(`/room/${code}`);
        return;
      }

      if (players.length >= 4) {
        setError('Room is full. Maximum 4 players.');
        setLoading(false);
        return;
      }

      // Assign an available color
      const takenColors = players.map((p) => p.color);
      const availableColors = ['red', 'green', 'yellow', 'blue'].filter((c) => !takenColors.includes(c));
      const chosenColor = availableColors[0] || 'green';

      const newPlayer = {
        id: playerId,
        name: nickname.trim(),
        color: chosenColor,
        is_ready: false,
        is_host: false,
      };

      const updatedPlayers = [...players, newPlayer];

      const { error: updateError } = await supabase
        .from('ludo_rooms')
        .update({ players: updatedPlayers })
        .eq('id', room.id);

      if (updateError) throw updateError;

      router.push(`/room/${code}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to join room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        
        {/* Logo/Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-2xl flex items-center justify-center shadow-purple-500/20">
            <div className="w-full h-full rounded-2xl bg-[#090616] flex items-center justify-center">
              <Dice5 size={44} className="text-purple-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-wider neon-title text-purple-400 mt-2">
            NEON LUDO
          </h1>
          <p className="text-secondary text-sm font-medium">
            Real-time Multiplayer Board Game
          </p>
        </div>

        {/* Action Panel */}
        <div className="w-full glass-panel-glow p-6 flex flex-col gap-6">
          {!isSupabaseConfigured && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs py-3 px-4 rounded-lg flex flex-col gap-1.5 text-center font-semibold leading-relaxed">
              <span>⚠️ Supabase is not configured!</span>
              <span className="text-[10px] text-purple-300/80 font-normal font-mono">
                Please edit <code className="bg-black/30 px-1 py-0.5 rounded text-amber-400">.env.local</code> with your real credentials, and run <code className="bg-black/30 px-1 py-0.5 rounded text-amber-400">schema.sql</code> in the Supabase SQL editor.
              </span>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs py-2.5 px-3 rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          {/* Nickname Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold font-mono tracking-wider text-purple-300">
              YOUR NICKNAME
            </label>
            <input
              type="text"
              maxLength={15}
              placeholder="Enter your name..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="glass-input px-4 py-3 text-sm"
              disabled={loading}
            />
          </div>

          <div className="border-t border-purple-500/10 my-1" />

          {/* Forms Section */}
          <div className="flex flex-col gap-5">
            {/* Create Room Form */}
            <form onSubmit={handleCreateRoom}>
              <button
                type="submit"
                disabled={loading || !nickname.trim()}
                className="glass-button w-full py-3.5 text-sm font-bold tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Plus size={16} />
                CREATE NEW GAME
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-secondary text-[11px] font-bold font-mono">OR JOIN EXISTING</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* Join Room Form */}
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Enter 6-digit room code..."
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                className="glass-input px-4 py-3 text-sm text-center uppercase tracking-widest font-mono"
                maxLength={6}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !nickname.trim() || !roomCodeInput.trim()}
                className="w-full py-3.5 rounded-lg border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 text-purple-200 hover:text-white text-sm font-bold tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                <LogIn size={16} />
                JOIN GAME
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-secondary font-mono tracking-wide opacity-50">
          Powered by Next.js & Supabase Realtime
        </p>
      </div>
    </div>
  );
}
