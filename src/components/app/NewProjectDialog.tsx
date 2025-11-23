import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveProject, getUser, setCurrentProjectId, saveMessage } from '@/lib/storage';
import { Project, ToneOfVoice, ChatMessage } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onProjectChange: (id: string) => void;
}

const NewProjectDialog = ({ open, onOpenChange, onSuccess, onProjectChange }: NewProjectDialogProps) => {
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [tone, setTone] = useState<ToneOfVoice>('professional');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !websiteUrl.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const user = getUser();
    if (!user) {
      toast.error('User not found. Please log in again.');
      return;
    }

    setIsLoading(true);

    try {
      // Create project in database
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: name.trim(),
          website_url: websiteUrl.trim(),
          tone_of_voice: tone,
          custom_notes: '',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Save to localStorage for compatibility
      const project: Project = {
        id: newProject.id,
        userId: newProject.user_id,
        name: newProject.name,
        websiteUrl: newProject.website_url || '',
        toneOfVoice: newProject.tone_of_voice,
        researchData: newProject.research_data,
        customNotes: newProject.custom_notes || '',
        createdAt: newProject.created_at,
        updatedAt: newProject.updated_at,
      };
      saveProject(project);
      setCurrentProjectId(project.id);

      toast.success('Project created successfully!');

      // Add initial message
      const initialMessage: ChatMessage = {
        id: crypto.randomUUID(),
        projectId: project.id,
        role: 'system',
        content: 'Project created! Gathering research data...',
        messageType: 'database_update',
        creditsUsed: 0,
        createdAt: new Date().toISOString(),
      };
      saveMessage(initialMessage);

      // Fetch research in background
      const { data: researchResult, error: researchError } = await supabase.functions.invoke('fetch-research', {
        body: { 
          websiteUrl: websiteUrl.trim(), 
          projectName: name.trim() 
        }
      });

      if (researchError) {
        console.error('Research fetch error:', researchError);
        
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          projectId: project.id,
          role: 'system',
          content: '⚠️ Failed to fetch research data. You can add custom notes or try refreshing later.',
          messageType: 'database_update',
          creditsUsed: 0,
          createdAt: new Date().toISOString(),
        };
        saveMessage(errorMessage);
        
        toast.error('Failed to fetch research');
      } else if (researchResult?.researchData) {
        // Update project with research data
        await supabase
          .from('projects')
          .update({ research_data: researchResult.researchData })
          .eq('id', newProject.id);

        // Update localStorage
        project.researchData = researchResult.researchData;
        saveProject(project);

        const successMessage: ChatMessage = {
          id: crypto.randomUUID(),
          projectId: project.id,
          role: 'system',
          content: '✅ Research data gathered successfully! You can now add documents or start generating copy.',
          messageType: 'database_update',
          creditsUsed: 0,
          createdAt: new Date().toISOString(),
        };
        saveMessage(successMessage);

        toast.success('Research complete!');
      }

      setName('');
      setWebsiteUrl('');
      setTone('professional');
      
      onProjectChange(project.id);
      onSuccess();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up your copywriting project with basic information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="My Awesome Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone">Tone of Voice</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as ToneOfVoice)}>
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectDialog;
