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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Simple markdown-like formatter with React elements
  const FormattedMessage = ({ content }: { content: string }) => {
    // Remove Perplexity citations [1], [2], etc.
    const cleanContent = content.replace(/\[\d+\]/g, '');
    const lines = cleanContent.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType;
        elements.push(
          <ListTag key={elements.length} className={listType === 'ul' ? 'list-disc ml-6 my-2 space-y-1' : 'list-decimal ml-6 my-2 space-y-1'}>
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ListTag>
        );
        listItems = [];
        listType = null;
      }
    };

    const formatInline = (text: string): string => {
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
        .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('###')) {
        flushList();
        elements.push(<h3 key={elements.length} className="text-base font-semibold mt-4 mb-2">{trimmed.replace(/^###\s*/, '')}</h3>);
      } else if (trimmed.startsWith('##')) {
        flushList();
        elements.push(<h2 key={elements.length} className="text-lg font-semibold mt-4 mb-2">{trimmed.replace(/^##\s*/, '')}</h2>);
      } else if (trimmed.startsWith('#')) {
        flushList();
        elements.push(<h1 key={elements.length} className="text-xl font-bold mt-4 mb-2">{trimmed.replace(/^#\s*/, '')}</h1>);
      }
      // Bullet points
      else if (trimmed.match(/^[-*•]\s+/)) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(trimmed.replace(/^[-*•]\s+/, ''));
      }
      // Numbered lists
      else if (trimmed.match(/^\d+\.\s+/)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push(trimmed.replace(/^\d+\.\s+/, ''));
      }
      // Horizontal rule
      else if (trimmed === '---' || trimmed === '___') {
        flushList();
        elements.push(<hr key={elements.length} className="my-4 border-border" />);
      }
      // Empty line
      else if (trimmed === '') {
        flushList();
        if (elements.length > 0 && elements[elements.length - 1].type !== 'br') {
          elements.push(<div key={elements.length} className="h-2" />);
        }
      }
      // Regular paragraph
      else {
        flushList();
        elements.push(
          <p 
            key={elements.length} 
            className="mb-2" 
            dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} 
          />
        );
      }
    });

    flushList(); // Flush any remaining list

    return <div className="space-y-1">{elements}</div>;
  };

  useEffect(() => {
    if (projectId) {
      const projectMessages = getProjectMessages(projectId);
      setMessages(projectMessages);
    } else {
      setMessages([]);
    }
  }, [projectId]);

  useEffect(() => {
    // Scroll to bottom when messages change or loading state changes
    const scrollToBottom = () => {
      if (scrollContainerRef.current) {
        const scrollElement = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }
    };

    // Use setTimeout to ensure DOM has updated
    setTimeout(scrollToBottom, 100);
  }, [messages, isLoading]);

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
        projectName: project.name,
        websiteUrl: project.websiteUrl,
        toneOfVoice: project.toneOfVoice,
        researchData: project.researchData,
        customNotes: project.customNotes,
      };

      // Prepare conversation history for ChatGPT
      const conversationHistory = messages
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        }));

      // Add current message
      conversationHistory.push({
        role: 'user',
        content: currentInput,
      });

      // Call the chat-with-gpt edge function
      const { data, error } = await supabase.functions.invoke('chat-with-gpt', {
        body: {
          messages: conversationHistory,
          context,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate response');
      }

      if (!data || !data.generatedCopy) {
        throw new Error('No response from AI');
      }

      // Clean up citations (just in case)
      let cleanedContent = data.generatedCopy;
      cleanedContent = cleanedContent.replace(/\[\d+\]/g, '');

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
        content: cleanedContent,
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
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0">
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
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4 max-w-3xl mx-auto" ref={scrollRef}>
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
                    {message.role === 'assistant' ? (
                      <FormattedMessage content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.creditsUsed > 0 && (
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                        💳 {message.creditsUsed} credit used
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
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 flex-shrink-0">
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
