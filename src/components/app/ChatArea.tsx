import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { getProjectMessages, saveMessage, getProject } from '@/lib/storage';
import { ChatMessage } from '@/types';

interface ChatAreaProps {
  projectId: string | null;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

const ChatArea = ({ projectId, onTogglePanel, isPanelOpen }: ChatAreaProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      const projectMessages = getProjectMessages(projectId);
      setMessages(projectMessages);
    } else {
      setMessages([]);
    }
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !projectId) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      projectId,
      role: 'user',
      content: input,
      messageType: 'chat',
      creditsUsed: 0,
      createdAt: new Date().toISOString(),
    };

    saveMessage(newMessage);
    setMessages([...messages, newMessage]);
    setInput('');

    // Mock assistant response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        projectId,
        role: 'assistant',
        content: "This is a prototype. API integration will be added soon. Try asking to 'change tone' or 'update notes' to test database updates (free), or request copy generation (1 credit).",
        messageType: 'chat',
        creditsUsed: 0,
        createdAt: new Date().toISOString(),
      };
      saveMessage(assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Welcome to CopySensei</h2>
          <p className="text-muted-foreground">Create a project to start generating copy</p>
        </div>
      </div>
    );
  }

  const project = getProject(projectId);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{project?.name}</h2>
          <p className="text-sm text-muted-foreground">{project?.websiteUrl}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePanel}
        >
          {isPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Start a conversation or generate your first copy
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 
                  message.role === 'system' ? 'justify-center' : 'justify-start'
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-chat-user text-foreground'
                      : message.role === 'system'
                      ? 'bg-chat-system text-muted-foreground text-sm'
                      : 'bg-chat-assistant border border-border text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.creditsUsed > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {message.creditsUsed} credit used
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask to update project details or generate copy..."
              className="min-h-[80px] resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="lg">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Copy (1 credit)
            </Button>
            <Button onClick={handleSend} size="lg">
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
