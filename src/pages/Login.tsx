import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Zap, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { setUser } from '@/lib/storage';
const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(async ({
      data: {
        session
      }
    }) => {
      if (session?.user) {
        // Fetch profile from database
        const {
          data: profile
        } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle();
        if (profile) {
          setUser({
            id: profile.user_id,
            email: profile.email,
            credits: profile.credits,
            createdAt: profile.created_at
          });
          navigate('/app');
        }
      }
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch profile from database
        const {
          data: profile
        } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle();
        if (profile) {
          setUser({
            id: profile.user_id,
            email: profile.email,
            credits: profile.credits,
            createdAt: profile.created_at
          });
          navigate('/app');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/app`
        }
      });
      if (error) throw error;
      toast.success('Check your email for the login link!');
      setEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send login email');
    } finally {
      setLoading(false);
    }
  };
  return <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">CopySensei</CardTitle>
          </div>
          <CardDescription className="text-base font-sans font-medium">Copy Clarity, Guided by Your Sensei 🥷🏻 </CardDescription>
        </CardHeader>
        <CardContent>
          <TrendingUp onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="h-11" disabled={loading} required />
            </div>
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </TrendingUp>
        </CardContent>
      </Card>
    </div>;
};
export default Login;