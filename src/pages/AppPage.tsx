import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getCurrentProjectId } from '@/lib/storage';
import AppSidebar from '@/components/app/AppSidebar';
import ChatArea from '@/components/app/ChatArea';
import DatabasePanel from '@/components/app/DatabasePanel';

const AppPage = () => {
  const navigate = useNavigate();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/');
      return;
    }

    const projectId = getCurrentProjectId();
    setCurrentProjectId(projectId);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar 
        currentProjectId={currentProjectId}
        onProjectChange={setCurrentProjectId}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea 
          projectId={currentProjectId}
          onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
          isPanelOpen={isPanelOpen}
        />
      </div>

      {/* Database Panel */}
      {isPanelOpen && currentProjectId && (
        <DatabasePanel 
          projectId={currentProjectId}
          onClose={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
};

export default AppPage;
