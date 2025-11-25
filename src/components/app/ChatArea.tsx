import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, PanelRightClose, PanelRightOpen, Loader2 } from 'lucide-react';
import { getProjectMessages, saveMessage, getProject, getUser, updateUser } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ChatAreaProps {
  projectId: string | null;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

const ChatArea = ({ projectId, onTogglePanel, isPanelOpen }: ChatAreaProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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

  const shouldCostCredits = (userMessage: string): boolean => {
    const copyGenerationKeywords = [
      'generate',
      'write',
      'create copy',
      'write copy',
      'make copy',
      'draft',
      'compose',
      'write me',
      'create me',
      'generate me',
    ];

    const lowerMessage = userMessage.toLowerCase();
    return copyGenerationKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  const handleSend = async (isGenerateCopy: boolean = false) => {
    if (!input.trim() || !projectId || isLoading) return;

    const project = getProject(projectId);
    if (!project) {
      toast({
        title: 'Error',
        description: 'Project not found',
        variant: 'destructive',
      });
      return;
    }

    const user = getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not found',
        variant: 'destructive',
      });
      return;
    }

    // Check if this will cost credits
    const willCostCredits = isGenerateCopy || shouldCostCredits(input);
    
    if (willCostCredits && user.credits < 1) {
      toast({
        title: 'Insufficient Credits',
        description: 'You need at least 1 credit to generate copy',
        variant: 'destructive',
      });
      return;
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      projectId,
      role: 'user',
      content: input,
      messageType: willCostCredits ? 'copy_generation' : 'chat',
      creditsUsed: 0,
      createdAt: new Date().toISOString(),
    };

    saveMessage(userMessage);
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Prepare context for the edge function
      const context = {
        toneOfVoice: project.toneOfVoice,
        researchData: project.researchData,
        customNotes: project.customNotes,
      };

      // For chat (non-copy generation), create a conversational prompt
      let prompt = currentInput;
      if (!willCostCredits) {
        // Add context to make it conversational
        prompt = `You are CopySensei, a helpful copywriting assistant. The user is working on a project called "${project.name}" for ${project.websiteUrl}. 
        
User question: ${currentInput}

Please respond helpfully. If they're asking to update project details or asking general questions, respond conversationally without generating actual copy. Only generate marketing copy if explicitly requested.`;
      }

      // Call the generate-copy edge function
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          prompt,
          context,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate response');
      }

      if (!data || !data.generatedCopy) {
        throw new Error('No response from AI');
      }

      // Deduct credits if needed
      const creditsUsed = willCostCredits ? 1 : 0;
      if (creditsUsed > 0) {
        const updatedUser = {
          ...user,
          credits: user.credits - creditsUsed,
        };
        updateUser(updatedUser);
        
        // Also update in Supabase database
        await supabase
          .from('profiles')
          .update({ credits: updatedUser.credits })
          .eq('user_id', user.id);
        
        toast({
          title: 'Credit Used',
          description: `1 credit used. ${updatedUser.credits} credits remaining.`,
        });
      }

      // Save assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        projectId,
        role: 'assistant',
        content: data.generatedCopy,
        messageType: willCostCredits ? 'copy_generation' : 'chat',
        creditsUsed,
        createdAt: new Date().toISOString(),
      };

      saveMessage(assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
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
  const user = getUser();

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{project?.name}</h2>
          <p className="text-sm text-muted-foreground">{project?.websiteUrl}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Credits: <span className="font-semibold text-foreground">{user?.credits || 0}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePanel}
          >
            {isPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Start a conversation or generate your first copy
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Tip: Copy generation costs 1 credit. Updates are free!
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
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
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-3 max-w-[80%] bg-chat-assistant border border-border text-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Generating response...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
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
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => handleSend(true)}
              disabled={!input.trim() || isLoading || (user?.credits || 0) < 1}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Copy (1 credit)
            </Button>
            <Button 
              onClick={() => handleSend(false)} 
              size="lg"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
