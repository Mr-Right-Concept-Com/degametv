import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Save, UserRound } from 'lucide-react';

export default function StudioProfile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userId = user?.id;
  const metadataFullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;
    void (async () => {
      const { data, error } = await supabase.from('profiles')
        .select('full_name,company_name')
        .eq('user_id', userId)
        .maybeSingle();
      if (!active) return;
      if (error) toast.error('Creator profile could not be loaded.');
      setFullName(data?.full_name || metadataFullName);
      setCompanyName(data?.company_name || '');
      setLoading(false);
    })();
    return () => { active = false; };
  }, [userId, metadataFullName]);

  const save = async () => {
    if (!user?.id) return;
    if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      toast.error('Enter a name between 2 and 100 characters.');
      return;
    }
    if (companyName.trim().length > 160) {
      toast.error('Company or studio name must be 160 characters or fewer.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('profiles')
        .update({ full_name: fullName.trim(), company_name: companyName.trim() || null })
        .eq('user_id', user.id)
        .select('user_id')
        .maybeSingle();
      if (error || !data) {
        toast.error(error?.message || 'Creator profile was not saved.');
        return;
      }
      toast.success('Creator profile saved. New releases will use these details automatically.');
    } finally {
      setSaving(false);
    }
  };

  return <StudioLayout title="Creator Profile" description="Manage your identity once. Your releases inherit these details automatically.">
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5"/> Creator identity</CardTitle>
          <CardDescription>Your verified account email is managed by authentication and cannot be changed here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin"/></div> : <>
            <div className="space-y-2"><Label htmlFor="creator-full-name">Full name</Label><Input id="creator-full-name" value={fullName} maxLength={100} onChange={e=>setFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="creator-email">Account email</Label><Input id="creator-email" value={user?.email || ''} readOnly disabled /></div>
            <div className="space-y-2"><Label htmlFor="creator-company">Company / studio name</Label><Input id="creator-company" value={companyName} maxLength={160} onChange={e=>setCompanyName(e.target.value)} placeholder="Optional studio or production company" /></div>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}Save creator profile</Button>
          </>}
        </CardContent>
      </Card>
    </div>
  </StudioLayout>;
}
