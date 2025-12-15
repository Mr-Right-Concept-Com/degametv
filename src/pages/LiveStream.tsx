import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Heart, Share2, MessageCircle, Send, Settings, Maximize } from 'lucide-react';
import { mockLiveStreams } from '@/data/mockData';
import { useState } from 'react';

const mockChat = [
  { id: '1', user: 'StreamFan42', message: 'Amazing stream! 🔥', time: '2m ago' },
  { id: '2', user: 'MovieBuff', message: 'This is so cool', time: '1m ago' },
  { id: '3', user: 'NightOwl', message: 'Hello everyone!', time: '30s ago' },
  { id: '4', user: 'CinemaLover', message: 'Great quality!', time: '10s ago' },
];

export default function LiveStream() {
  const { id } = useParams<{ id: string }>();
  const [chatMessage, setChatMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);

  const stream = mockLiveStreams.find((s) => s.id === id);

  if (!stream) {
    return (
      <MainLayout showFooter={false}>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Stream not found</h1>
          <Button asChild>
            <Link to="/live">Back to Live</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter={false}>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Video Player */}
        <div className="flex-1 flex flex-col">
          {/* Player */}
          <div className="relative flex-1 bg-black">
            <img
              src={stream.banner_url || stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-full object-cover"
            />
            
            {/* Player Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge className="bg-accent text-white border-0">
                      <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
                      LIVE
                    </Badge>
                    <span className="text-white flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {stream.viewer_count?.toLocaleString()} watching
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                      <Settings className="w-5 h-5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                      <Maximize className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stream Info */}
          <div className="p-4 bg-card border-t border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold">{stream.title}</h1>
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                  {stream.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Heart className="w-4 h-4" />
                  Like
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 md:hidden"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {stream.chat_enabled && isChatOpen && (
          <div className="w-80 border-l border-border flex flex-col bg-card hidden md:flex">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Live Chat
              </h3>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {mockChat.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary/20">
                        {msg.user[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-primary">{msg.user}</span>
                        <span className="text-xs text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Send a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
