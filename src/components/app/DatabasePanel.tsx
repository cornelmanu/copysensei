import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, RefreshCw, Upload, FileText, Trash2 } from 'lucide-react';
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
          websiteUrl: project.websiteUrl, 
          projectName: project.name 
        }
      });

      if (researchError) {
        console.error('Research fetch error:', researchError);
        toast.error('Failed to fetch research');
      } else if (researchResult?.researchData) {
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
      }
    } catch (error) {
      console.error('Error refreshing research:', error);
      toast.error('Failed to refresh research');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!project) return null;

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
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              {project.researchData ? (
                <p>Research data loaded</p>
              ) : (
                <p>No research data yet. Click refresh to analyze website.</p>
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
