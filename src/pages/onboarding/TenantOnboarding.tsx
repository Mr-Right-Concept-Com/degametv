import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, Check, Zap, Building2, 
  Loader2, Play, Globe, CreditCard, Rocket,
  Film, Radio, Clapperboard, Tv, Smartphone, Ticket,
  Store, Palette, BarChart3, Glasses, Code2, Headphones, Database,
  GraduationCap, Settings, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { MODULE_DEFINITIONS, ModuleId, getCoreModules, getAddonModules } from '@/types/modules';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Film, Radio, Clapperboard, Tv, Smartphone, Ticket, CreditCard,
  Store, Palette, BarChart3, Glasses, Code2, Headphones, Database,
  GraduationCap, Settings, Package
};

type OnboardingStep = 'welcome' | 'platform' | 'modules' | 'billing' | 'provisioning' | 'complete';

interface OnboardingData {
  platformName: string;
  companyName: string;
  email: string;
  selectedModules: ModuleId[];
  billingOption: 'trial' | 'pay';
  plan: 'starter' | 'professional' | 'enterprise';
}

export default function TenantOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisioningProgress, setProvisioningProgress] = useState(0);
  
  const [data, setData] = useState<OnboardingData>({
    platformName: '',
    companyName: '',
    email: '',
    selectedModules: getCoreModules().map(m => m.id),
    billingOption: 'trial',
    plan: 'professional'
  });

  const steps: { id: OnboardingStep; label: string; icon: React.ElementType }[] = [
    { id: 'welcome', label: 'Welcome', icon: Zap },
    { id: 'platform', label: 'Platform', icon: Building2 },
    { id: 'modules', label: 'Modules', icon: Play },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'provisioning', label: 'Launch', icon: Rocket },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const stepOrder: OnboardingStep[] = ['welcome', 'platform', 'modules', 'billing', 'provisioning'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: OnboardingStep[] = ['welcome', 'platform', 'modules', 'billing', 'provisioning'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleProvision = async () => {
    setProvisioning(true);
    
    // Simulate provisioning steps
    const provisioningSteps = [
      'Generating Tenant UUID...',
      'Creating subdomain...',
      'Provisioning namespace...',
      'Deploying selected modules...',
      'Creating database schemas...',
      'Building dynamic admin...',
      'Initializing billing...',
      'Finalizing setup...'
    ];
    
    for (let i = 0; i < provisioningSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setProvisioningProgress(((i + 1) / provisioningSteps.length) * 100);
    }
    
    setCurrentStep('complete');
    setProvisioning(false);
    toast.success('Your platform is ready!');
  };

  const toggleModule = (moduleId: ModuleId) => {
    const module = MODULE_DEFINITIONS.find(m => m.id === moduleId);
    if (module?.isCore) return; // Can't toggle core modules
    
    setData(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(moduleId)
        ? prev.selectedModules.filter(id => id !== moduleId)
        : [...prev.selectedModules, moduleId]
    }));
  };

  const calculateMonthlyPrice = () => {
    let total = 0;
    if (data.plan === 'starter') total = 299;
    else if (data.plan === 'professional') total = 799;
    else total = 0; // Enterprise = custom

    // Add addon modules
    data.selectedModules.forEach(moduleId => {
      const module = MODULE_DEFINITIONS.find(m => m.id === moduleId);
      if (module && !module.isCore && module.pricing.basePrice) {
        total += module.pricing.basePrice;
      }
    });

    return total;
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || Package;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-foreground fill-current" />
              </div>
              <span className="text-xl font-display font-bold text-gradient">
                JUVUKO
              </span>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = index <= currentStepIndex;
                const isCurrent = step.id === currentStep;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                      isCurrent && "bg-primary text-primary-foreground",
                      isActive && !isCurrent && "text-primary",
                      !isActive && "text-muted-foreground"
                    )}>
                      <StepIcon className="w-4 h-4" />
                      <span className="hidden lg:inline">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "w-8 h-0.5 mx-1",
                        isActive ? "bg-primary" : "bg-border"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 min-h-screen flex items-center">
        <div className="container mx-auto px-4">
          {/* Step: Welcome */}
          {currentStep === 'welcome' && (
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
                <Zap className="w-3 h-3 mr-1" />
                Autopilot Onboarding
              </Badge>
              
              <h1 className="text-5xl font-display font-bold mb-6">
                Launch Your Streaming
                <span className="block text-gradient">Platform in Minutes</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Select your modules, configure your brand, and we'll auto-provision 
                your entire infrastructure. Zero technical setup required.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Button size="lg" className="gradient-primary gap-2 text-lg px-8" onClick={handleNext}>
                  Start Building
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <span>Zero-Touch Setup</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <span>Custom Domain</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary" />
                  </div>
                  <span>17 Modules</span>
                </div>
              </div>
            </div>
          )}

          {/* Step: Platform Details */}
          {currentStep === 'platform' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold mb-2">
                  Name Your Platform
                </h2>
                <p className="text-muted-foreground">
                  This will be your white-label streaming service
                </p>
              </div>
              
              <div className="space-y-6 bg-card p-8 rounded-2xl border border-border">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    placeholder="My Streaming Service"
                    value={data.platformName}
                    onChange={e => setData(prev => ({ ...prev, platformName: e.target.value }))}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Your subdomain: {data.platformName.toLowerCase().replace(/\s+/g, '-') || 'your-platform'}.juvuko.com
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Your Company LLC"
                    value={data.companyName}
                    onChange={e => setData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={data.email}
                    onChange={e => setData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  className="gradient-primary" 
                  onClick={handleNext}
                  disabled={!data.platformName || !data.email}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Module Selection */}
          {currentStep === 'modules' && (
            <div className="max-w-5xl mx-auto animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold mb-2">
                  Select Your Modules
                </h2>
                <p className="text-muted-foreground">
                  Core modules are included. Add-ons can be enabled anytime.
                </p>
              </div>
              
              {/* Core Modules */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-success" />
                  Core Modules (Included)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getCoreModules().map(module => {
                    const IconComponent = getIconComponent(module.icon);
                    return (
                      <div
                        key={module.id}
                        className="p-4 rounded-xl bg-card border border-primary/30 opacity-90"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComponent className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{module.name}</h4>
                              <Badge variant="secondary" className="text-xs">Included</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {module.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Add-on Modules */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Add-on Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getAddonModules().map(module => {
                    const IconComponent = getIconComponent(module.icon);
                    const isSelected = data.selectedModules.includes(module.id);
                    
                    return (
                      <div
                        key={module.id}
                        onClick={() => toggleModule(module.id)}
                        className={cn(
                          "p-4 rounded-xl bg-card border cursor-pointer transition-all",
                          isSelected ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={isSelected}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-primary" />
                              <h4 className="font-medium">{module.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {module.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {module.pricing.basePrice && (
                                <Badge variant="outline">${module.pricing.basePrice}/mo</Badge>
                              )}
                              {module.status === 'beta' && (
                                <Badge className="bg-blue-500/20 text-blue-400">Beta</Badge>
                              )}
                              {module.status === 'coming-soon' && (
                                <Badge className="bg-muted text-muted-foreground">Soon</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button className="gradient-primary" onClick={handleNext}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Billing */}
          {currentStep === 'billing' && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold mb-2">
                  Choose Your Plan
                </h2>
                <p className="text-muted-foreground">
                  Start with a 7-day free trial or pay now
                </p>
              </div>
              
              {/* Plan Selection */}
              <RadioGroup 
                value={data.plan} 
                onValueChange={(value) => setData(prev => ({ ...prev, plan: value as typeof prev.plan }))}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
              >
                {[
                  { id: 'starter', name: 'Starter', price: 299, desc: 'For small creators' },
                  { id: 'professional', name: 'Professional', price: 799, desc: 'For growing businesses' },
                  { id: 'enterprise', name: 'Enterprise', price: null, desc: 'Custom solutions' }
                ].map(plan => (
                  <Label
                    key={plan.id}
                    htmlFor={plan.id}
                    className={cn(
                      "flex flex-col p-6 rounded-xl bg-card border cursor-pointer transition-all",
                      data.plan === plan.id ? "border-primary shadow-lg" : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{plan.name}</span>
                      {plan.id === 'professional' && (
                        <Badge className="bg-primary">Popular</Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {plan.price ? `$${plan.price}` : 'Custom'}
                      {plan.price && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  </Label>
                ))}
              </RadioGroup>
              
              {/* Billing Option */}
              <div className="bg-card p-6 rounded-xl border border-border mb-8">
                <h3 className="font-semibold mb-4">Billing Option</h3>
                <RadioGroup 
                  value={data.billingOption} 
                  onValueChange={(value) => setData(prev => ({ ...prev, billingOption: value as 'trial' | 'pay' }))}
                  className="space-y-3"
                >
                  <Label
                    htmlFor="trial"
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                      data.billingOption === 'trial' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="trial" id="trial" />
                      <div>
                        <span className="font-medium">Start 7-Day Free Trial</span>
                        <p className="text-sm text-muted-foreground">No credit card required</p>
                      </div>
                    </div>
                    <Badge variant="outline">Free</Badge>
                  </Label>
                  
                  <Label
                    htmlFor="pay"
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                      data.billingOption === 'pay' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="pay" id="pay" />
                      <div>
                        <span className="font-medium">Pay Now</span>
                        <p className="text-sm text-muted-foreground">Get 2 months free (annual)</p>
                      </div>
                    </div>
                    <Badge className="gradient-primary">${calculateMonthlyPrice()}/mo</Badge>
                  </Label>
                </RadioGroup>
              </div>
              
              {/* Summary */}
              <div className="bg-muted/30 p-6 rounded-xl mb-8">
                <h3 className="font-semibold mb-4">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform</span>
                    <span>{data.platformName || 'Your Platform'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="capitalize">{data.plan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modules</span>
                    <span>{data.selectedModules.length} selected</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Monthly Total</span>
                      <span className="text-primary">
                        {data.billingOption === 'trial' ? 'Free for 7 days' : `$${calculateMonthlyPrice()}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button className="gradient-primary" onClick={handleProvision}>
                  <Rocket className="w-4 h-4 mr-2" />
                  Launch Platform
                </Button>
              </div>
            </div>
          )}

          {/* Step: Provisioning */}
          {currentStep === 'provisioning' && provisioning && (
            <div className="max-w-lg mx-auto text-center animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full gradient-primary flex items-center justify-center animate-pulse">
                <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
              </div>
              
              <h2 className="text-3xl font-display font-bold mb-4">
                Provisioning Your Platform
              </h2>
              
              <p className="text-muted-foreground mb-8">
                Auto-deploying {data.selectedModules.length} modules...
              </p>
              
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full gradient-primary transition-all duration-500"
                  style={{ width: `${provisioningProgress}%` }}
                />
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                {Math.round(provisioningProgress)}% complete
              </p>
            </div>
          )}

          {/* Step: Complete */}
          {currentStep === 'complete' && (
            <div className="max-w-lg mx-auto text-center animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="w-12 h-12 text-success" />
              </div>
              
              <h2 className="text-3xl font-display font-bold mb-4">
                Your Platform is Ready!
              </h2>
              
              <p className="text-muted-foreground mb-8">
                {data.platformName} has been provisioned with {data.selectedModules.length} modules.
              </p>
              
              <div className="bg-card p-6 rounded-xl border border-border mb-8 text-left">
                <h3 className="font-semibold mb-4">Your Dashboard</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="text-sm">
                      {data.platformName.toLowerCase().replace(/\s+/g, '-')}.juvuko.com
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="text-sm">Admin Dashboard Ready</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-primary" />
                    <span className="text-sm">{data.selectedModules.length} Modules Active</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="gradient-primary gap-2" onClick={() => navigate('/admin')}>
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/cinema')}>
                  Preview Frontend
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
