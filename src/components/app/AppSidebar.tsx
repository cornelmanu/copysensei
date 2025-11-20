import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Coins, LogOut, Info } from 'lucide-react';
import { getUser, getProjects, setCurrentProjectId, clearUser } from '@/lib/storage';
import { Project } from '@/types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import NewProjectDialog from './NewProjectDialog';

interface AppSidebarProps {
  currentProjectId: string | null;
  onProjectChange: (id: string | null) => void;
}

const AppSidebar = ({ currentProjectId, onProjectChange }: AppSidebarProps) => {
  const [credits, setCredits] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = getUser();
    if (user) {
      setCredits(user.credits);
    }
    loadProjects();
  }, []);

  const loadProjects = () => {
    const allProjects = getProjects();
    setProjects(allProjects);
  };

  const handleProjectClick = (id: string) => {
    setCurrentProjectId(id);
    onProjectChange(id);
  };

  const handleNewProject = () => {
    loadProjects();
    setIsNewProjectOpen(false);
  };

  const handleLogout = () => {
    clearUser();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return (
    <>
      <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">CopySensei</h1>
        </div>

        {/* Credits */}
        <div className="p-4">
          <div className="flex items-center justify-between p-3 bg-sidebar-accent rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sidebar-foreground">Credits: {credits}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Projects */}
        <div className="p-4">
          <Button 
            onClick={() => setIsNewProjectOpen(true)}
            className="w-full" 
            variant="default"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No projects yet. Create your first one!
              </p>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentProjectId === project.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                  }`}
                >
                  <div className="font-medium truncate">{project.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* User Menu */}
        <div className="p-4 border-t border-sidebar-border">
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="w-full justify-start"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <NewProjectDialog 
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        onSuccess={handleNewProject}
        onProjectChange={onProjectChange}
      />
    </>
  );
};

export default AppSidebar;
