import {useEffect,useState} from 'react';
import {z} from 'zod';
import {Link,useSearchParams} from 'react-router-dom';
import {MainLayout} from '@/components/layout/MainLayout';
import {Card,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {CheckCircle,Clock,AlertCircle,Loader2,Ticket} from 'lucide-react';
import {usePageTitle} from '@/hooks/usePageTitle';

const paymentStatusResponseSchema=z.object({status:z.string(),email:z.string().email().optional()}).passthrough();
export default function PaymentReturn(){
 usePageTitle('Payment confirmation');
 const [params]=useSearchParams();const reference=params.get('reference')||'';
 const {user}=useAuth();const [status,setStatus]=useState<'checking'|'pending'|'paid'|'failed'|'unknown'>('checking');const [email,setEmail]=useState('');
 const walletTopup=reference.startsWith('DTVW_');
 useEffect(()=>{
  let active=true;
  let checks=0;
  let terminal=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const check=async()=>{
   if(!/^DTV(?:L|G|W)?_[A-Za-z0-9]+$/.test(reference)||reference.length<20||reference.length>80){
    if(active)setStatus('unknown');
    return;
   }
   try{
    if(walletTopup){
     const {data:order,error}=await supabase.from('wallet_topup_orders').select('status').eq('provider_reference',reference).maybeSingle();
     if(!active)return;
     if(error||!order)setStatus('pending');
     else{
      terminal=order.status==='paid'||order.status==='failed'||order.status==='refunded';
      setStatus(order.status==='paid'?'paid':order.status==='failed'||order.status==='refunded'?'failed':'pending');
     }
    }else{
     const {data,error}=await supabase.functions.invoke('payment-status',{body:{reference}});
     if(!active)return;
     if(error||data===null||data===undefined){
     setStatus('pending');
    }else{
     const payload:unknown=data;
     const parsed=paymentStatusResponseSchema.safeParse(payload);
     if(!parsed.success){
      console.error('payment_status_invalid_response',parsed.error);
      setStatus('pending');
     }else{
      setEmail(parsed.data.email??'');
      terminal=parsed.data.status==='paid'||parsed.data.status==='failed';
      setStatus(parsed.data.status==='paid'?'paid':parsed.data.status==='failed'?'failed':'pending');
     }
    }
    }
   }catch(error){
    if(active){console.error('payment_status_check_failed',error);setStatus('pending');}
   }
   checks+=1;
   if(active&&!terminal&&checks<20)timer=setTimeout(()=>{void check();},3000);
  };
  void check();
  return()=>{active=false;if(timer)clearTimeout(timer);};
 },[reference]);
 const live=reference.startsWith('DTVL_');
 const contribution=reference.startsWith('DTVG_');
 return <MainLayout><div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-12"><Card className="w-full"><CardContent className="space-y-4 p-8 text-center">
 {status==='checking'&&<Loader2 className="mx-auto h-12 w-12 animate-spin text-primary"/>}
 {status==='pending'&&<Clock className="mx-auto h-12 w-12 text-amber-500"/>}
 {status==='paid'&&<CheckCircle className="mx-auto h-12 w-12 text-green-600"/>}
 {status==='failed'&&<AlertCircle className="mx-auto h-12 w-12 text-destructive"/>}
 {status==='unknown'&&<AlertCircle className="mx-auto h-12 w-12 text-destructive"/>}
 <Badge variant={status==='paid'?'default':status==='failed'?'destructive':'secondary'}>{status==='checking'?'Checking payment':status==='paid'?'Payment confirmed':status==='failed'?'Payment not completed':status==='unknown'?'Invalid reference':'Awaiting confirmation'}</Badge>
 <h1 className="text-2xl font-bold">{status==='paid'?(walletTopup?'Personal Wallet funded':'You’re all set'):status==='failed'?'Payment was not completed':status==='unknown'?'Payment reference unavailable':'Confirming your payment'}</h1>
 <p className="text-sm text-muted-foreground">{status==='paid'?(walletTopup?'Your verified top-up has been credited to your Personal Wallet.':contribution?'Your creator tip or digital gift has been confirmed. Contributions do not grant ticket or playback access.':live?(user?'Your live event pass is being added to My Tickets.':'Your secure ticket claim instructions will be sent to your email.'):'Your screening ticket is ready.'):status==='failed'?(walletTopup?'The wallet top-up was not completed. No wallet funds were credited.':'No ticket was issued. You can return to the cinema and try again.'):status==='unknown'?'The return link does not contain a valid payment reference.':'Your payment provider is confirming the transaction. Keep this page open; it will refresh automatically.'}</p>
 {email&&<p className="text-sm">Ticket delivery: <span className="font-medium">{email}</span></p>}
 <p className="break-all rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground">Reference: {reference||'—'}</p>
 <div className="flex flex-wrap justify-center gap-2">{status==='paid'&&walletTopup&&user&&<Button asChild><Link to="/dashboard?tab=wallet">Open Personal Wallet</Link></Button>}{status==='paid'&&user&&!contribution&&!walletTopup&&<Button asChild><Link to="/tickets"><Ticket className="mr-2 h-4 w-4"/>My Tickets</Link></Button>}<Button variant="outline" asChild><Link to="/cinema">Return to cinema</Link></Button></div>
 </CardContent></Card></div></MainLayout>;
}