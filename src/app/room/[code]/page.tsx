'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Player,
  PlayerColor,
  GameState,
  COLOR_ORDER,
  getMovableTokens,
  moveToken,
  checkWinner,
  getNextPlayerIndex,
} from '@/lib/ludoEngine';
import Lobby from '@/components/Lobby';
import GameBoard from '@/components/GameBoard';
import Dice from '@/components/Dice';
import Chat from '@/components/Chat';
import { Volume2, VolumeX, LogOut, ArrowLeft, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const { code } = use(params);
  const router = useRouter();
  
  // Game Room States
  const [room, setRoom] = React.useState<any | null>(null);
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [gameState, setGameState] = React.useState<GameState | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = React.useState<number>(0);
  const [roomStatus, setRoomStatus] = React.useState<string>('waiting');
  
  // Client Identity
  const [currentPlayerId, setCurrentPlayerId] = React.useState<string>('');
  const [currentPlayer, setCurrentPlayer] = React.useState<Player | null>(null);
  
  // UI States
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [isRolling, setIsRolling] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  // Retrieve player identity on load
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('ludo_player_id');
      if (!storedId) {
        router.push('/');
        return;
      }
      setCurrentPlayerId(storedId);
    }
  }, [router]);

  // Synthetic sound effects using Web Audio API
  const playSound = React.useCallback((type: 'roll' | 'move' | 'capture' | 'home' | 'victory' | 'fail') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'roll') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
        osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.07); // E4
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'capture') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'home') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.25); // C6
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'victory') {
        const playTone = (freq: number, start: number, duration: number) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.setValueAtTime(freq, ctx.currentTime + start);
          g.gain.setValueAtTime(0.12, ctx.currentTime + start);
          g.gain.linearRampToValueAtTime(0.01, ctx.currentTime + start + duration);
          o.start(ctx.currentTime + start);
          o.stop(ctx.currentTime + start + duration);
        };
        playTone(523.25, 0, 0.15); // C5
        playTone(659.25, 0.15, 0.15); // E5
        playTone(783.99, 0.3, 0.15); // G5
        playTone(1046.5, 0.45, 0.45); // C6
      } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Audio playback not supported or blocked by user policy:', e);
    }
  }, [soundEnabled]);

  // Insert a system-level log into the chat messages
  const sendSystemLog = async (text: string) => {
    await supabase.from('ludo_messages').insert([{
      room_id: room.id,
      sender_id: 'system',
      sender_name: 'SYSTEM',
      sender_color: 'purple',
      text
    }]);
  };

  // Fetch the room data on load and subscribe to real-time events
  React.useEffect(() => {
    if (!currentPlayerId) return;

    const fetchRoom = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('ludo_rooms')
          .select('*')
          .eq('room_code', code.toUpperCase())
          .maybeSingle();

        if (dbError) throw dbError;

        if (!data) {
          setError('Room not found.');
          setLoading(false);
          return;
        }

        const roomPlayers = data.players as Player[];
        const me = roomPlayers.find((p) => p.id === currentPlayerId);

        if (!me) {
          setError('You are not joined in this room.');
          setLoading(false);
          return;
        }

        setRoom(data);
        setPlayers(roomPlayers);
        setCurrentPlayer(me);
        setRoomStatus(data.status);
        setGameState(data.game_state as GameState);
        setCurrentTurnIndex(data.current_turn);
        setLoading(false);

        // If game is finished and has winner, check confetti
        if (data.status === 'finished' && data.game_state.winner) {
          confetti({ particleCount: 150, spread: 80 });
        }
      } catch (err: any) {
        console.error(err);
        setError('Error fetching room details.');
        setLoading(false);
      }
    };

    fetchRoom();

    // Subscribe to database changes
    const channel = supabase
      .channel(`ludo_room_sync_${code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ludo_rooms',
          filter: `room_code=eq.${code.toUpperCase()}`,
        },
        (payload: any) => {
          const updatedRoom = payload.new as any;
          setRoom(updatedRoom);
          setRoomStatus(updatedRoom.status);
          setPlayers(updatedRoom.players as Player[]);
          
          const roomPlayers = updatedRoom.players as Player[];
          const me = roomPlayers.find((p) => p.id === currentPlayerId);
          if (me) setCurrentPlayer(me);

          setGameState(updatedRoom.game_state as GameState);
          setCurrentTurnIndex(updatedRoom.current_turn);

          // Realtime sound cue when someone rolls or moves
          const prevGameState = gameState;
          const nextGameState = updatedRoom.game_state as GameState;

          if (prevGameState) {
            // Dice Roll Sound
            if (nextGameState.dice_state === 'rolling' && prevGameState.dice_state !== 'rolling') {
              playSound('roll');
            }
            // Move/Capture/Goal cues
            if (nextGameState.dice_state === 'idle' && prevGameState.dice_state === 'rolled_need_move') {
              // A move occurred
              playSound('move');
            }
          }

          // Trigger Confetti on new winner
          if (updatedRoom.status === 'finished' && nextGameState.winner && (!prevGameState || !prevGameState.winner)) {
            playSound('victory');
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, currentPlayerId, playSound]);

  // Handle color change selection in Lobby
  const handleSelectColor = async (color: PlayerColor) => {
    if (!room || roomStatus !== 'waiting') return;

    const updatedPlayers = players.map((p) => {
      if (p.id === currentPlayerId) {
        return { ...p, color };
      }
      return p;
    });

    const { error: err } = await supabase
      .from('ludo_rooms')
      .update({ players: updatedPlayers })
      .eq('id', room.id);

    if (err) console.error('Error changing color:', err);
  };

  // Handle marking ready in Lobby
  const handleUpdateReady = async (ready: boolean) => {
    if (!room || roomStatus !== 'waiting') return;

    const updatedPlayers = players.map((p) => {
      if (p.id === currentPlayerId) {
        return { ...p, is_ready: ready };
      }
      return p;
    });

    const { error: err } = await supabase
      .from('ludo_rooms')
      .update({ players: updatedPlayers })
      .eq('id', room.id);

    if (err) console.error('Error updating ready status:', err);
  };

  // Start the game (Host only)
  const handleStartGame = async () => {
    if (!room || !currentPlayer?.is_host) return;

    // Double check that players colors are unique
    const colors = players.map((p) => p.color);
    const uniqueColors = new Set(colors);
    if (uniqueColors.size !== players.length) {
      alert('Every player must select a unique color!');
      return;
    }

    // Set initial game turn based on Red player, or first active color
    let initialTurnIndex = 0;
    const activeColors = players.map((p) => p.color);
    if (!activeColors.includes('red')) {
      // Start with whichever active color is first in sequence
      const firstColor = COLOR_ORDER.find((c) => activeColors.includes(c));
      initialTurnIndex = COLOR_ORDER.indexOf(firstColor || 'red');
    }

    const initialGameState: GameState = {
      board_state: {
        red: [0, 0, 0, 0],
        green: [0, 0, 0, 0],
        yellow: [0, 0, 0, 0],
        blue: [0, 0, 0, 0],
      },
      dice_value: null,
      dice_state: 'idle',
      rolls_left_for_six: 1,
      winner: null,
      consecutive_sixes: 0,
    };

    const { error: err } = await supabase
      .from('ludo_rooms')
      .update({
        status: 'playing',
        current_turn: initialTurnIndex,
        game_state: initialGameState,
      })
      .eq('id', room.id);

    if (err) {
      console.error('Error starting game:', err);
    } else {
      sendSystemLog('🎮 The game has started! Good luck.');
    }
  };

  // Execute Dice Roll
  const handleRollDice = async () => {
    if (!room || !gameState || isRolling) return;
    
    // Safety check: is it my turn?
    const currentTurnColor = COLOR_ORDER[currentTurnIndex];
    if (currentPlayer?.color !== currentTurnColor) return;

    setIsRolling(true);
    playSound('roll');

    // Update DB to show dice is rolling
    const rollingGameState: GameState = {
      ...gameState,
      dice_state: 'rolling',
      dice_value: null,
    };

    await supabase
      .from('ludo_rooms')
      .update({ game_state: rollingGameState })
      .eq('id', room.id);

    // Wait for the rolling animation (800ms)
    setTimeout(async () => {
      const rolledValue = Math.floor(Math.random() * 6) + 1;
      
      const activeColors = players.map((p) => p.color);
      const movable = getMovableTokens(gameState.board_state, currentTurnColor, rolledValue);

      let nextDiceState: GameState['dice_state'] = 'rolled_need_move';
      let nextTurnIndex = currentTurnIndex;
      let nextConsecutiveSixes = gameState.consecutive_sixes || 0;
      let nextGameState = { ...gameState };

      if (rolledValue === 6) {
        nextConsecutiveSixes += 1;
      } else {
        nextConsecutiveSixes = 0;
      }

      // Check rule: 3 consecutive sixes ends turn
      if (nextConsecutiveSixes === 3) {
        playSound('fail');
        nextDiceState = 'idle';
        nextTurnIndex = getNextPlayerIndex(currentTurnIndex, activeColors);
        nextConsecutiveSixes = 0;
        
        nextGameState = {
          board_state: gameState.board_state,
          dice_value: rolledValue,
          dice_state: nextDiceState,
          rolls_left_for_six: 1,
          winner: null,
          consecutive_sixes: nextConsecutiveSixes,
        };

        await supabase
          .from('ludo_rooms')
          .update({
            game_state: nextGameState,
            current_turn: nextTurnIndex,
          })
          .eq('id', room.id);

        sendSystemLog(`⚠️ ${currentPlayer.name} rolled three 6s! Turn passed to ${players.find((p) => p.color === COLOR_ORDER[nextTurnIndex])?.name}.`);
        setIsRolling(false);
        return;
      }

      // Check if player has NO valid moves
      if (movable.length === 0) {
        playSound('fail');
        nextDiceState = 'no_moves_possible';
        
        // Update state to show no moves
        const tempGameState: GameState = {
          board_state: gameState.board_state,
          dice_value: rolledValue,
          dice_state: 'no_moves_possible',
          rolls_left_for_six: 1,
          winner: null,
          consecutive_sixes: nextConsecutiveSixes,
        };

        await supabase
          .from('ludo_rooms')
          .update({ game_state: tempGameState })
          .eq('id', room.id);

        sendSystemLog(`🎲 ${currentPlayer.name} rolled a ${rolledValue} (No moves possible).`);

        // Wait 1.5 seconds so players can see the "No moves" banner, then auto pass turn
        setTimeout(async () => {
          // If they rolled a 6, they might get another turn even with no moves?
          // Standard Ludo rule: rolling a 6 grants another turn, even if you couldn't move any token.
          // Let's implement that! If roll is 6, they keep turn, otherwise pass.
          let nextPlayerIdx = currentTurnIndex;
          if (rolledValue !== 6) {
            nextPlayerIdx = getNextPlayerIndex(currentTurnIndex, activeColors);
          }

          const finalGameState: GameState = {
            board_state: gameState.board_state,
            dice_value: null,
            dice_state: 'idle',
            rolls_left_for_six: 1,
            winner: null,
            consecutive_sixes: nextConsecutiveSixes,
          };

          await supabase
            .from('ludo_rooms')
            .update({
              game_state: finalGameState,
              current_turn: nextPlayerIdx,
            })
            .eq('id', room.id);

          setIsRolling(false);
        }, 1500);

        return;
      }

      // If valid moves exist, update the dice roll outcome and wait for token click
      const rolledGameState: GameState = {
        board_state: gameState.board_state,
        dice_value: rolledValue,
        dice_state: nextDiceState,
        rolls_left_for_six: 1,
        winner: null,
        consecutive_sixes: nextConsecutiveSixes,
      };

      await supabase
        .from('ludo_rooms')
        .update({ game_state: rolledGameState })
        .eq('id', room.id);

      sendSystemLog(`🎲 ${currentPlayer.name} rolled a ${rolledValue}.`);
      setIsRolling(false);
    }, 800);
  };

  // Move Token Execution (Click handler)
  const handleMoveToken = async (tokenIndex: number) => {
    if (!room || !gameState || isRolling) return;

    const currentTurnColor = COLOR_ORDER[currentTurnIndex];
    if (currentPlayer?.color !== currentTurnColor) return;
    if (gameState.dice_state !== 'rolled_need_move' || gameState.dice_value === null) return;

    const roll = gameState.dice_value;
    const { boardState: nextBoardState, captureOccurred, reachedHomeOccurred } = moveToken(
      gameState.board_state,
      currentTurnColor,
      tokenIndex,
      roll
    );

    // Audio cue
    if (captureOccurred) {
      playSound('capture');
      sendSystemLog(`💥 ${currentPlayer.name} captured an opponent's token!`);
    } else if (reachedHomeOccurred) {
      playSound('home');
      sendSystemLog(`🎉 ${currentPlayer.name} got a token HOME!`);
    } else {
      playSound('move');
    }

    // Check if player won
    const won = checkWinner(nextBoardState, currentTurnColor);
    let nextWinner = gameState.winner;
    let nextRoomStatus = roomStatus;

    if (won) {
      nextWinner = currentTurnColor;
      nextRoomStatus = 'finished';
      sendSystemLog(`👑 ${currentPlayer.name} HAS WON THE GAME!`);
    }

    // Determine who rolls next
    const activeColors = players.map((p) => p.color);
    let nextTurnIndex = currentTurnIndex;

    // Rule: Player gets another roll if they rolled a 6, captured a token, or reached home!
    const extraRollGranted = roll === 6 || captureOccurred || reachedHomeOccurred;

    if (!extraRollGranted && !won) {
      nextTurnIndex = getNextPlayerIndex(currentTurnIndex, activeColors);
    }

    const finalGameState: GameState = {
      board_state: nextBoardState,
      dice_value: null,
      dice_state: 'idle',
      rolls_left_for_six: 1,
      winner: nextWinner,
      consecutive_sixes: roll === 6 ? gameState.consecutive_sixes : 0,
    };

    await supabase
      .from('ludo_rooms')
      .update({
        status: nextRoomStatus,
        game_state: finalGameState,
        current_turn: nextTurnIndex,
      })
      .eq('id', room.id);
  };

  // Reset Game to Play Again (Host only)
  const handleResetGame = async () => {
    if (!room || !currentPlayer?.is_host) return;

    const initialGameState: GameState = {
      board_state: {
        red: [0, 0, 0, 0],
        green: [0, 0, 0, 0],
        yellow: [0, 0, 0, 0],
        blue: [0, 0, 0, 0],
      },
      dice_value: null,
      dice_state: 'idle',
      rolls_left_for_six: 1,
      winner: null,
      consecutive_sixes: 0,
    };

    // Set host to roll first
    const hostColor = currentPlayer.color;
    const initialTurnIdx = COLOR_ORDER.indexOf(hostColor);

    const { error: err } = await supabase
      .from('ludo_rooms')
      .update({
        status: 'playing',
        current_turn: initialTurnIdx,
        game_state: initialGameState,
      })
      .eq('id', room.id);

    if (err) {
      console.error('Error resetting game:', err);
    } else {
      sendSystemLog('🔄 The game has been restarted by the host!');
    }
  };

  // Exit Room
  const handleLeaveRoom = async () => {
    if (!room) return;

    try {
      const updatedPlayers = players.filter((p) => p.id !== currentPlayerId);

      // If room is empty, delete it
      if (updatedPlayers.length === 0) {
        await supabase.from('ludo_rooms').delete().eq('id', room.id);
      } else {
        // If host leaves, assign new host
        let nextHostId = room.host_id;
        if (currentPlayer?.is_host && updatedPlayers.length > 0) {
          updatedPlayers[0].is_host = true;
          nextHostId = updatedPlayers[0].id;
        }

        await supabase
          .from('ludo_rooms')
          .update({
            players: updatedPlayers,
            host_id: nextHostId,
          })
          .eq('id', room.id);
      }

      router.push('/');
    } catch (e) {
      console.error(e);
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary font-semibold font-mono text-sm tracking-widest uppercase">
            Loading room...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen">
        <div className="w-full max-w-sm glass-panel-glow p-6 text-center flex flex-col gap-5">
          <div className="text-rose-400 font-extrabold text-lg">⚠️ ERROR</div>
          <p className="text-sm text-secondary">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="glass-button py-2.5 text-xs tracking-wider flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            BACK TO HOME
          </button>
        </div>
      </div>
    );
  }

  const currentTurnColor = COLOR_ORDER[currentTurnIndex];
  const isMyTurn = currentPlayer?.color === currentTurnColor;
  const isWinnerScreen = roomStatus === 'finished' && gameState?.winner;

  // Active movable tokens calculation for current player
  const activeMovableTokens = isMyTurn && gameState && gameState.dice_value !== null
    ? getMovableTokens(gameState.board_state, currentTurnColor, gameState.dice_value)
    : [];

  return (
    <div className="flex-1 flex flex-col min-h-screen p-4 md:p-6 overflow-y-auto lg:overflow-hidden select-none">
      
      {/* Top Navbar */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between pb-4 border-b border-purple-500/10 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold font-mono tracking-widest text-purple-300 neon-title hidden sm:block">
            NEON LUDO
          </h2>
          <span className="px-3 py-1 bg-purple-950/40 border border-purple-500/20 text-xs font-semibold rounded-lg font-mono text-purple-200">
            ROOM: {code.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-secondary hover:text-white hover:bg-white/10 transition-all"
            title={soundEnabled ? 'Disable Sounds' : 'Enable Sounds'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Leave room */}
          <button
            onClick={handleLeaveRoom}
            className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-rose-300 hover:text-rose-200 hover:bg-rose-900/30 transition-all flex items-center gap-1.5 text-xs font-semibold font-mono"
          >
            <LogOut size={14} />
            LEAVE
          </button>
        </div>
      </div>

      {/* Main Room View */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {roomStatus === 'waiting' ? (
          <Lobby
            roomCode={code}
            players={players}
            currentPlayerId={currentPlayerId}
            onUpdateReady={handleUpdateReady}
            onSelectColor={handleSelectColor}
            onStartGame={handleStartGame}
            isHost={currentPlayer?.is_host || false}
          />
        ) : (
          <>
            {/* Left: Ludo board panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-3 glass-panel relative overflow-hidden">
              {/* Turn Indicator Banner */}
              <div className="w-full flex items-center justify-between px-4 py-2.5 bg-black/30 border-b border-white/5 absolute top-0 left-0 right-0 z-20">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full animate-pulse"
                    style={{
                      backgroundColor: `var(--neon-${currentTurnColor})`,
                      boxShadow: `0 0 8px var(--neon-${currentTurnColor}-glow)`,
                    }}
                  />
                  <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    {isMyTurn ? 'YOUR TURN' : `${players.find(p => p.color === currentTurnColor)?.name || currentTurnColor.toUpperCase()}'s TURN`}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono font-medium text-secondary">
                  {/* Status subtitle */}
                  {gameState?.dice_state === 'rolled_need_move' && (
                    <span className="text-purple-300 animate-pulse">Select token to move</span>
                  )}
                  {gameState?.dice_state === 'no_moves_possible' && (
                    <span className="text-rose-400">No moves possible! Passing...</span>
                  )}
                </div>
              </div>

              {/* GameBoard */}
              <div className="mt-8 mb-4 w-full flex justify-center">
                {gameState && (
                  <GameBoard
                    boardState={gameState.board_state}
                    activeTurnColor={currentTurnColor}
                    movableTokens={activeMovableTokens}
                    onMoveToken={handleMoveToken}
                    currentPlayerColor={currentPlayer?.color || 'red'}
                    isMyTurn={isMyTurn}
                  />
                )}
              </div>

              {/* Winner overlay layer */}
              {isWinnerScreen && (
                <div className="absolute inset-0 bg-black/85 backdrop-filter backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 gap-6">
                  <div className="text-center flex flex-col gap-2">
                    <span className="text-[10px] font-bold font-mono tracking-widest text-purple-400">VICTORY OVERLAY</span>
                    <h2 className="text-4xl font-black tracking-widest neon-title text-purple-300">
                      GAME OVER
                    </h2>
                    <p className="text-md text-white mt-2 font-semibold">
                      🥇 {players.find(p => p.color === gameState.winner)?.name} wins the match!
                    </p>
                  </div>
                  
                  {currentPlayer?.is_host && (
                    <button
                      onClick={handleResetGame}
                      className="glass-button px-6 py-3 flex items-center gap-2 text-sm tracking-wider"
                    >
                      <RotateCcw size={16} />
                      PLAY AGAIN
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Sidebar with Turn Controller / Chat */}
            <div className="w-full lg:w-[320px] flex flex-col gap-5 shrink-0">
              
              {/* Turn Control panel */}
              <div className="glass-panel-glow p-5 flex flex-col items-center gap-4 text-center">
                <h3 className="text-sm font-bold font-mono text-purple-300 border-b border-purple-500/10 pb-2 w-full">
                  GAME STATUS
                </h3>

                {/* Player List summary */}
                <div className="w-full flex flex-col gap-2.5 my-1">
                  {players.map((p) => {
                    const isTurn = p.color === currentTurnColor;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
                          isTurn
                            ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                            : 'bg-black/10 border-white/5 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: `var(--neon-${p.color})`,
                              boxShadow: `0 0 6px var(--neon-${p.color}-glow)`,
                            }}
                          />
                          <span className="text-white truncate max-w-[120px]">{p.name}</span>
                        </div>
                        {isTurn && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                            ROLLING
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-purple-500/10 w-full my-1" />

                {/* Dice Action Box */}
                {gameState && (
                  <Dice
                    value={gameState.dice_value}
                    isRolling={gameState.dice_state === 'rolling' || isRolling}
                    onClick={handleRollDice}
                    disabled={!isMyTurn || gameState.dice_state !== 'idle' || isRolling}
                    activeColor={currentTurnColor}
                  />
                )}
              </div>

              {/* Live Room Chat */}
              <div className="flex-1 min-h-[300px]">
                <Chat
                  roomId={room.id}
                  currentPlayerId={currentPlayerId}
                  currentPlayerName={currentPlayer?.name || 'Player'}
                  currentPlayerColor={currentPlayer?.color || 'red'}
                />
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
