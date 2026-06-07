import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Reaction { id: string; emoji: string; x: number }
interface Props { screeningId: string; canSend?: boolean }

const EMOJIS = ['❤️', '🔥', '😂', '😮', '👏', '🎬'];

export function LiveReactions({ screeningId, canSend = true }: Props) {
  const [floating, setFloating] = useState<Reaction[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`reactions:${screeningId}`)
      .on('broadcast', { event: 'reaction' }, (payload) => {
        const r: Reaction = {
          id: crypto.randomUUID(),
          emoji: payload.payload.emoji,
          x: Math.random() * 80 + 10,
        };
        setFloating(prev => [...prev, r]);
        setTimeout(() => setFloating(prev => prev.filter(p => p.id !== r.id)), 3000);
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [screeningId]);

  const send = async (emoji: string) => {
    await channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { emoji } });
    supabase.from('live_reactions').insert({ screening_id: screeningId, emoji }).then(() => {});
  };

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {floating.map(r => (
          <div
            key={r.id}
            className="absolute text-3xl sm:text-4xl animate-[float_3s_ease-out_forwards]"
            style={{ left: `${r.x}%`, bottom: '10%' }}
          >
            {r.emoji}
          </div>
        ))}
      </div>
      {canSend && (
        <div className="absolute right-3 bottom-20 sm:bottom-24 flex flex-col gap-2 z-30">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => send(e)}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 text-xl transition-transform active:scale-90"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-300px) scale(1.4); opacity: 0; }
        }
      `}</style>
    </>
  );
}
