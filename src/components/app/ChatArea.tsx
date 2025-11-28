import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, PanelRightClose, PanelRightOpen, Loader2, Copy, Check } from 'lucide-react';
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Simple markdown-like formatter with React elements
  const FormattedMessage = ({ content }: { content: string }) => {
    // Remove Perplexity citations [1], [2], etc.
    const cleanContent = content.replace(/\[\d+\]/g, '');
    
    // Split content into main copy and explanation if present
    const whyItWorksMatch = cleanContent.match(/---\s*WHY THIS WORKS\s*---\s*([\s\S]*)/i);
    const mainContent = whyItWorksMatch 
      ? cleanContent.substring(0, whyItWorksMatch.index).trim()
      : cleanContent;
    const explanation = whyItWorksMatch ? whyItWorksMatch[1].trim() : null;
    
    const lines = mainContent.split('\n');
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
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold + italic
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>') // Bold
        .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>') // Italic
        .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>'); // Code
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('###')) {
        flushList();
        const headerText = trimmed.replace(/^###\s*/, '').replace(/\*\*/g, '');
        elements.push(<h3 key={elements.length} className="text-base font-semibold mt-4 mb-2">{headerText}</h3>);
      } else if (trimmed.startsWith('##')) {
        flushList();
        const headerText = trimmed.replace(/^##\s*/, '').replace(/\*\*/g, '');
        elements.push(<h2 key={elements.length} className="text-lg font-semibold mt-4 mb-2">{headerText}</h2>);
      } else if (trimmed.startsWith('#')) {
        flushList();
        const headerText = trimmed.replace(/^#\s*/, '').replace(/\*\*/g, '');
        elements.push(<h1 key={elements.length} className="text-xl font-bold mt-4 mb-2">{headerText}</h1>);
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
        // Check if line starts with bold text (like "**Headline:**")
        if (trimmed.match(/^\*\*[^*]+\*\*:/)) {
          // This is a label-style line, make it stand out
          elements.push(
            <p 
              key={elements.length} 
              className="mb-2 font-medium" 
              dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} 
            />
          );
        } else {
          elements.push(
            <p 
              key={elements.length} 
              className="mb-2" 
              dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} 
            />
          );
        }
      }
    });

    flushList(); // Flush any remaining list

    return (
      <div>
        <div className="space-y-1">{elements}</div>
        {explanation && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-primary">Why This Copy Works</h4>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              <FormattedExplanation content={explanation} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Simpler formatter for explanation text
  const FormattedExplanation = ({ content }: { content: string }) => {
    return (
      <div 
        className="space-y-2"
        dangerouslySetInnerHTML={{ 
          __html: content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
              // Bold
              let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
              // Italic
              formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
              return `<p class="mb-1">${formatted}</p>`;
            })
            .join('')
        }} 
      />
    );
  };

  const handleCopyMessage = (content: string, messageId: string) => {
    // Remove the "Why This Works" section before copying
    const mainContent = content.split(/---\s*WHY THIS WORKS\s*---/i)[0].trim();
    
    navigator.clipboard.writeText(mainContent);
    setCopiedMessageId(messageId);
    toast({
      title: 'Copied!',
      description: 'Copy has been copied to clipboard',
    });
    setTimeout(() => setCopiedMessageId(null), 2000);
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
        // Try to find the viewport element
        const viewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
      
      // Also try direct ref
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };

    // Multiple attempts to ensure scroll happens after render
    setTimeout(scrollToBottom, 0);
    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 300);
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
      'create a',
      'write a',
      'make a',
      'give me a',
      'craft',
      'develop copy',
      'produce',
    ];

    const lowerMessage = userMessage.toLowerCase();
    return copyGenerationKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  const isSimpleChat = (userMessage: string): boolean => {
    // Detect if user is just trying to chat (not asking for copy or project updates)
    const projectUpdateKeywords = [
      'change',
      'update',
      'set',
      'modify',
      'adjust',
      'tone',
      'notes',
      'style',
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    
    // If it's copy generation, it's fine
    if (shouldCostCredits(lowerMessage)) {
      return false;
    }
    
    // If it's project updates, it's fine
    if (projectUpdateKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return false;
    }
    
    // Check for common chat phrases that don't serve a purpose
    const chatPhrases = [
      'how are you',
      'what can you do',
      'tell me about',
      'what is',
      'who are you',
      'hello',
      'hi ',
      'hey ',
      'thanks',
      'thank you',
    ];
    
    return chatPhrases.some(phrase => lowerMessage.includes(phrase));
  };

  const handleSend = async () => {
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

    // Check if user is trying to just chat (discourage this)
    if (isSimpleChat(input)) {
      toast({
        title: 'Ask CopySensei to Generate Copy',
        description: 'To get the most value, ask me to write or generate specific copy for your project. Example: "Write a headline for my homepage"',
        variant: 'default',
      });
      return;
    }

    // Check if this will cost credits
    const willCostCredits = shouldCostCredits(input);
    
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

      // Call the generate-copy edge function with conversation history
      const { data, error } = await supabase.functions.invoke('generate-copy', {
        body: {
          messages: conversationHistory,
          context: enhancedContext,
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
                    className={`rounded-lg px-4 py-3 max-w-[80%] relative group ${
                      message.role === 'user'
                        ? 'bg-chat-user text-foreground'
                        : message.role === 'system'
                        ? 'bg-chat-system text-muted-foreground text-sm'
                        : 'bg-chat-assistant border border-border text-foreground'
                    }`}
                  >
                    {message.role === 'assistant' && message.messageType === 'copy_generation' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyMessage(message.content, message.id)}
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
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
          {/* Scroll anchor at the bottom */}
          <div ref={scrollRef} />
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
              onClick={handleSend} 
              size="lg"
              disabled={!input.trim() || isLoading}
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : shouldCostCredits(input) ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate (1 credit)
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
