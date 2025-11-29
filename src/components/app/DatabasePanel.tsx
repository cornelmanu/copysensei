import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, RefreshCw, Upload, FileText, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { getProject, saveProject, getProjectDocuments, saveDocument, deleteDocument } from '@/lib/storage';
import { Project, ToneOfVoice, Document } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DatabasePanelProps {
  projectId: string;
  onClose: () => void;
}

const DatabasePanel = ({ projectId, onClose }: DatabasePanelProps) => {
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProject();
    loadDocuments();
  }, [projectId]);

  const loadProject = () => {
    const p = getProject(projectId);
    if (p) setProject(p);
  };

  const loadDocuments = () => {
    const docs = getProjectDocuments(projectId);
    setDocuments(docs);
  };

  const handleToneChange = (tone: ToneOfVoice) => {
    if (!project) return;
    const updated = { ...project, toneOfVoice: tone, updatedAt: new Date().toISOString() };
    saveProject(updated);
    setProject(updated);
    toast.success('Tone of voice updated');
  };

  const handleNotesChange = (notes: string) => {
    if (!project) return;
    const updated = { ...project, customNotes: notes, updatedAt: new Date().toISOString() };
    saveProject(updated);
    setProject(updated);
  };

  const handleAddDocument = () => {
    if (!newDocContent.trim() || !newDocName.trim()) {
      toast.error('Please provide document name and content');
      return;
    }

    const doc: Document = {
      id: crypto.randomUUID(),
      projectId,
      filename: newDocName,
      content: newDocContent,
      fileSize: newDocContent.length,
      uploadedAt: new Date().toISOString(),
    };

    saveDocument(doc);
    loadDocuments();
    setNewDocContent('');
    setNewDocName('');
    toast.success('Document added');
  };

  const handleDeleteDocument = (id: string) => {
    deleteDocument(id);
    loadDocuments();
    toast.success('Document deleted');
  };

  const handleRefreshResearch = async () => {
    if (!project) return;
    
    setIsRefreshing(true);
    toast.info('Gathering research data...');

    try {
      const { data: researchResult, error: researchError } = await supabase.functions.invoke('fetch-research', {
        body: { 
          websiteUrl: project.websiteUrl
        }
      });

      if (researchError) {
        console.error('Research fetch error:', researchError);
        toast.error('Failed to fetch research');
        setIsRefreshing(false);
        return;
      }
      
      if (researchResult?.researchData) {
        // Update project in database
        await supabase
          .from('projects')
          .update({ research_data: researchResult.researchData })
          .eq('id', projectId);

        // Update localStorage
        const updated = { ...project, researchData: researchResult.researchData };
        saveProject(updated);
        setProject(updated);

        toast.success('Research data refreshed successfully!');
        
        // Now auto-generate strategy brief
        await generateStrategyBrief(updated);
      }
    } catch (error) {
      console.error('Error refreshing research:', error);
      toast.error('Failed to refresh research');
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateStrategyBrief = async (projectData?: Project) => {
    const proj = projectData || project;
    if (!proj || !proj.researchData) return;
    
    setIsSynthesizing(true);
    toast.info('Generating strategy brief...');

    try {
      const docs = getProjectDocuments(projectId);
      
      const { data: briefResult, error: briefError } = await supabase.functions.invoke('synthesize-strategy', {
        body: {
          researchData: proj.researchData,
          documents: docs,
          projectInfo: {
            websiteUrl: proj.websiteUrl,
            toneOfVoice: proj.toneOfVoice,
            customNotes: proj.customNotes,
          }
        }
      });

      if (briefError) {
        console.error('Strategy synthesis error:', briefError);
        toast.error('Failed to generate strategy brief');
      } else if (briefResult?.strategyBrief) {
        // Update project with strategy brief
        await supabase
          .from('projects')
          .update({ strategy_brief: briefResult.strategyBrief })
          .eq('id', projectId);

        const updated = { ...proj, strategyBrief: briefResult.strategyBrief };
        saveProject(updated);
        setProject(updated);

        toast.success('Strategy brief generated!');
      }
    } catch (error) {
      console.error('Error generating strategy:', error);
      toast.error('Failed to generate strategy brief');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Format strategy brief markdown
  const FormattedStrategyBrief = ({ content }: { content: string }) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // H1 headers (# Header)
      if (trimmed.match(/^#\s+[^#]/)) {
        elements.push(
          <h1 key={idx} className="text-xl font-bold mt-6 mb-3 text-foreground">
            {trimmed.replace(/^#\s+/, '')}
          </h1>
        );
      }
      // H2 headers (## Header)
      else if (trimmed.match(/^##\s+[^#]/)) {
        elements.push(
          <h2 key={idx} className="text-lg font-semibold mt-5 mb-2 text-foreground">
            {trimmed.replace(/^##\s+/, '')}
          </h2>
        );
      }
      // H3 headers (### Header)
      else if (trimmed.match(/^###\s+/)) {
        elements.push(
          <h3 key={idx} className="text-base font-semibold mt-4 mb-2 text-foreground">
            {trimmed.replace(/^###\s+/, '')}
          </h3>
        );
      }
      // Bullet points
      else if (trimmed.match(/^[-*•]\s+/)) {
        const content = trimmed.replace(/^[-*•]\s+/, '');
        elements.push(
          <li 
            key={idx} 
            className="ml-4 mb-1 text-foreground"
            dangerouslySetInnerHTML={{ 
              __html: content
                .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
            }}
          />
        );
      }
      // Numbered lists
      else if (trimmed.match(/^\d+\.\s+/)) {
        const content = trimmed.replace(/^\d+\.\s+/, '');
        elements.push(
          <li 
            key={idx} 
            className="ml-4 mb-1 text-foreground list-decimal"
            dangerouslySetInnerHTML={{ 
              __html: content
                .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
            }}
          />
        );
      }
      // Horizontal rule
      else if (trimmed === '---' || trimmed === '___') {
        elements.push(<hr key={idx} className="my-4 border-border" />);
      }
      // Empty line
      else if (trimmed === '') {
        elements.push(<div key={idx} className="h-2" />);
      }
      // Regular paragraph
      else {
        elements.push(
          <p 
            key={idx} 
            className="mb-2 text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: trimmed
                .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
            }}
          />
        );
      }
    });

    return <div className="space-y-1">{elements}</div>;
  };
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  const parseResearchData = (data: string) => {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = data.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try to find JSON object directly in text
      const jsonObjectMatch = data.match(/\{[\s\S]*"company_overview"[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }
      
      // Try to parse directly
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse research data:', e);
      // If not valid JSON, return null
      return null;
    }
  };

  const renderJsonValue = (value: any, depth: number = 0, forceCollapsible: boolean = false): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-blue-600 dark:text-blue-400">{value.toString()}</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-green-600 dark:text-green-400">{value}</span>;
    }

    if (typeof value === 'string') {
      // For long strings (like company_overview and key_insights), make them collapsible
      if (forceCollapsible || value.length > 150) {
        const itemKey = `string-${depth}-${value.substring(0, 20)}`;
        const isExpanded = expandedSections.has(itemKey);
        
        return (
          <div>
            <div 
              className="cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
              onClick={() => toggleSection(itemKey)}
            >
              <div className="flex items-start gap-2">
                {isExpanded ? 
                  <ChevronDown className="w-3 h-3 mt-1 flex-shrink-0 text-muted-foreground" /> : 
                  <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0 text-muted-foreground" />
                }
                <span className="text-foreground text-xs">
                  {isExpanded ? value : `${value.substring(0, 100)}...`}
                </span>
              </div>
            </div>
          </div>
        );
      }
      return <span className="text-foreground">{value}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground">[]</span>;
      }
      
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="pl-4 border-l-2 border-border">
              <div className="flex gap-2">
                <span className="text-muted-foreground text-xs">[{index}]</span>
                <div className="flex-1">{renderJsonValue(item, depth + 1)}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <span className="text-muted-foreground">{'{}'}</span>;
      }

      return (
        <div className="space-y-2">
          {keys.map((key) => {
            const itemKey = `${depth}-${key}`;
            const isExpanded = expandedSections.has(itemKey);
            const hasNested = typeof value[key] === 'object' && value[key] !== null;
            // Check if this is a long text field that should be collapsible
            const isLongText = typeof value[key] === 'string' && (
              key === 'company_overview' || 
              key === 'key_insights' || 
              value[key].length > 150
            );

            return (
              <div key={key} className="space-y-1">
                <div 
                  className={`flex items-start gap-2 ${(hasNested || isLongText) ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1' : ''}`}
                  onClick={() => (hasNested || isLongText) && toggleSection(itemKey)}
                >
                  {(hasNested || isLongText) && (
                    isExpanded ? 
                      <ChevronDown className="w-3 h-3 mt-1 flex-shrink-0 text-muted-foreground" /> : 
                      <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-blue-600 dark:text-blue-400 font-medium text-xs flex-shrink-0">
                    {key}:
                  </span>
                  {!hasNested && !isLongText && (
                    <div className="flex-1 text-xs break-words">{renderJsonValue(value[key], depth + 1)}</div>
                  )}
                  {isLongText && !isExpanded && (
                    <div className="flex-1 text-xs text-foreground break-words">
                      {String(value[key]).substring(0, 100)}...
                    </div>
                  )}
                </div>
                {(hasNested || isLongText) && isExpanded && (
                  <div className="pl-5 border-l-2 border-border ml-1">
                    <div className="text-xs">{renderJsonValue(value[key], depth + 1, isLongText)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  if (!project) return null;

  const parsedResearch = project.researchData ? parseResearchData(project.researchData) : null;

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-card-foreground">Project Database</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Project Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-card-foreground">Project Info</h4>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Website URL</Label>
              <Input value={project.websiteUrl} disabled className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tone of Voice</Label>
              <Select value={project.toneOfVoice} onValueChange={(v) => handleToneChange(v as ToneOfVoice)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Strategy Brief */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-card-foreground">Strategy Brief</h4>
              {project.researchData && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => generateStrategyBrief()}
                  disabled={isSynthesizing}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isSynthesizing ? 'animate-spin' : ''}`} />
                  {isSynthesizing ? 'Generating...' : 'Regenerate'}
                </Button>
              )}
            </div>
            <div className="text-xs bg-muted p-3 rounded-md max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
              {project.strategyBrief ? (
                <FormattedStrategyBrief content={project.strategyBrief} />
              ) : isSynthesizing ? (
                <p className="text-muted-foreground">Generating comprehensive strategy brief...</p>
              ) : project.researchData ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">No strategy brief yet</p>
                  <Button size="sm" onClick={() => generateStrategyBrief()}>
                    Generate Strategy Brief
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">Run research first to generate strategy brief</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Research */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-card-foreground">Research</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRefreshResearch}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="text-xs bg-muted p-3 rounded-md max-h-[600px] overflow-y-auto">
              {parsedResearch ? (
                <div className="space-y-2">
                  {renderJsonValue(parsedResearch)}
                </div>
              ) : project.researchData ? (
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {project.researchData}
                </div>
              ) : (
                <p className="text-muted-foreground">No research data yet. Click refresh to analyze website.</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Documents */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-card-foreground">Documents</h4>
            
            <div className="space-y-2">
              <Input
                placeholder="Document name"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                className="text-sm"
              />
              <Textarea
                placeholder="Paste document content here..."
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                className="min-h-[100px] text-sm"
              />
              <Button onClick={handleAddDocument} size="sm" className="w-full">
                <Upload className="w-3 h-3 mr-1" />
                Add Document
              </Button>
            </div>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs truncate">{doc.filename}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No documents yet
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Custom Notes */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-card-foreground">Custom Notes</h4>
            <Textarea
              placeholder="Add your own notes about this project..."
              value={project.customNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="min-h-[120px] text-sm"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default DatabasePanel;
