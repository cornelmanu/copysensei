import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveProject, getUser, setCurrentProjectId, saveMessage } from '@/lib/storage';
import { Project, ToneOfVoice, ChatMessage } from '@/types';
import { toast } from 'sonner';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !websiteUrl.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const user = getUser();
    if (!user) return;

    const project: Project = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: name.trim(),
      websiteUrl: websiteUrl.trim(),
      toneOfVoice: tone,
      researchData: null,
      customNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProject(project);
    setCurrentProjectId(project.id);

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      projectId: project.id,
      role: 'system',
      content: `Project created! Research will be added when integrated with APIs. Add documents or generate your first copy.`,
      messageType: 'database_update',
      creditsUsed: 0,
      createdAt: new Date().toISOString(),
    };
    saveMessage(welcomeMessage);

    toast.success('Project created successfully!');
    
    setName('');
    setWebsiteUrl('');
    setTone('professional');
    
    onProjectChange(project.id);
    onSuccess();
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
          <Button type="submit" className="w-full">
            Create Project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectDialog;
