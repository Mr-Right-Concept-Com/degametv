import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {MainLayout} from '@/components/layout/MainLayout';
import {Card,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {CheckCircle,Clock,AlertCircle,Loader2,Ticket} from 'lucide-react';
import {usePageTitle} from '@/hooks/usePageTitle';
export default function PaymentReturn(){
 usePageTitle('Payment confirmation');
 const [params]=useSearchParams();const reference=params.get('reference')||'';
 const {user}=useAuth();const [status,setStatus]=useState<'checking'|'pending'|'paid'|'failed'|'unknown'>('checking');const [email,setEmail]=useState('');
 useEffect(()=>{let active=true;let checks=0;let timer:ReturnType<typeof setTimeout>|undefined;
  const check=async()=>{if(!/^DTV(?:L)?_[A-Za-z0-9]+$/.test(reference)){setStatus('unknown');return;}
   const {data,error}=await supabase.functions.invoke('payment-status',{body:{reference}});
   if(!active)return;
   if(error||!data){setStatus('pending');}
   else{setEmail(data.email||'');setStatus(data.status==='paid'?'paid':data.status==='failed'?'failed':'pending');}
   checks+=1;
   if(active&&checks<20&&data?.status!=='paid'&&data?.status!=='failed')timer=setTimeout(check,3000);
  };
  void check();return()=>{active=false;if(timer)clearTimeout(timer);};
 },[reference]);
 const live=reference.startsWith('DTVL_');
 return <MainLayout><div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-12"><Card className="w-full"><CardContent className="space-y-4 p-8 text-center">
 {status==='checking'&&<Loader2 className="mx-auto h-12 w-12 animate-spin text-primary"/>}
 {status==='pending'&&<Clock className="mx-auto h-12 w-12 text-amber-500"/>}
 {status==='paid'&&<CheckCircle className="mx-auto h-12 w-12 text-green-600"/>}
 {status==='failed'&&<AlertCircle className="mx-auto h-12 w-12 text-destructive"/>}
 {status==='unknown'&&<AlertCircle className="mx-auto h-12 w-12 text-destructive"/>}
 <Badge variant={status==='paid'?'default':status==='failed'?'destructive':'secondary'}>{status==='checking'?'Checking payment':status==='paid'?'Payment confirmed':status==='failed'?'Payment not completed':status==='unknown'?'Invalid reference':'Awaiting confirmation'}</Badge>
 <h1 className="text-2xl font-bold">{status==='paid'?'You’re all set':status==='failed'?'Payment was not completed':status==='unknown'?'Payment reference unavailable':'Confirming your payment'}</h1>
 <p className="text-sm text-muted-foreground">{status==='paid'?(live?(user?'Your live event pass is being added to My Tickets.':'Your secure ticket claim instructions will be sent to your email.'):'Your screening ticket is ready.'):status==='failed'?'No ticket was issued. You can return to the cinema and try again.':status==='unknown'?'The return link does not contain a valid payment reference.':'Your payment provider is confirming the transaction. Keep this page open; it will refresh automatically.'}</p>
 {email&&<p className="text-sm">Ticket delivery: <span className="font-medium">{email}</span></p>}
 <p className="break-all rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground">Reference: {reference||'—'}</p>
 <div className="flex flex-wrap justify-center gap-2">{status==='paid'&&user&&<Button asChild><Link to="/tickets"><Ticket className="mr-2 h-4 w-4"/>My Tickets</Link></Button>}<Button variant="outline" asChild><Link to="/cinema">Return to cinema</Link></Button></div>
 </CardContent></Card></div></MainLayout>;
}