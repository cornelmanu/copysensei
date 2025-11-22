import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentProjectId, setUser, clearUser } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import AppSidebar from '@/components/app/AppSidebar';
import ChatArea from '@/components/app/ChatArea';
import DatabasePanel from '@/components/app/DatabasePanel';

const AppPage = () => {
  const navigate = useNavigate();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate('/');
        return;
      }
      
      // Fetch profile from database
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      // If profile doesn't exist, create it
      if (!profile && session.user.email) {
        const { data: newProfile } = await supabase.from('profiles').insert({
          user_id: session.user.id,
          email: session.user.email,
          credits: 5
        }).select().single();
        profile = newProfile;
      }

      if (profile) {
        setUser({
          id: profile.user_id,
          email: profile.email,
          credits: profile.credits,
          createdAt: profile.created_at,
        });
      }

      const projectId = getCurrentProjectId();
      setCurrentProjectId(projectId);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearUser();
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return null;
  }

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
