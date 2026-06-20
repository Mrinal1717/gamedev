import React from 'react';
import { supabase } from '@/lib/supabase';
import { Send, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_color: string;
  text: string;
  created_at: string;
}

interface ChatProps {
  roomId: string;
  currentPlayerId: string;
  currentPlayerName: string;
  currentPlayerColor: string;
}

export default function Chat({
  roomId,
  currentPlayerId,
  currentPlayerName,
  currentPlayerColor,
}: ChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputText, setInputText] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Load existing messages
  React.useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('ludo_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room_messages_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ludo_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messagePayload = {
      room_id: roomId,
      sender_id: currentPlayerId,
      sender_name: currentPlayerName,
      sender_color: currentPlayerColor || 'purple',
      text: inputText.trim(),
    };

    setInputText('');

    const { error } = await supabase
      .from('ludo_messages')
      .insert([messagePayload]);

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'text-rose-400';
      case 'green': return 'text-emerald-400';
      case 'yellow': return 'text-amber-300';
      case 'blue': return 'text-blue-400';
      default: return 'text-purple-400';
    }
  };

  return (
    <div className="flex flex-col h-[400px] md:h-full w-full glass-panel border border-white/10 overflow-hidden rounded-xl">
      {/* Header */}
      <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex items-center gap-2">
        <MessageSquare size={18} className="text-purple-400" />
        <span className="font-bold text-sm font-mono text-purple-200 tracking-wider">ROOM CHAT</span>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-secondary italic">No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentPlayerId;
            const isSystem = msg.sender_id === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-1">
                  <span className="inline-block px-3 py-1 bg-purple-950/30 border border-purple-500/10 rounded-full text-[11px] font-mono text-purple-300">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] rounded-lg p-2.5 text-sm ${
                  isMe
                    ? 'self-end bg-purple-600/20 border border-purple-500/30 rounded-tr-none'
                    : 'self-start bg-white/5 border border-white/5 rounded-tl-none'
                }`}
              >
                {!isMe && (
                  <span className={`text-xs font-bold mb-1 font-mono ${getColorClass(msg.sender_color)}`}>
                    {msg.sender_name}
                  </span>
                )}
                <span className="text-white break-words select-text">{msg.text}</span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-black/30 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Say something..."
          className="flex-1 glass-input px-3 py-2 text-xs"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
