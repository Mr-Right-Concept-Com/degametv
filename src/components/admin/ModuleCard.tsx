import { cn } from '@/lib/utils';
import { Module, ModuleId } from '@/types/modules';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, ExternalLink } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';

interface ModuleCardProps {
  module: Module;
  enabled: boolean;
  onToggle: (moduleId: ModuleId, enabled: boolean) => void;
  className?: string;
}

export function ModuleCard({ module, enabled, onToggle, className }: ModuleCardProps) {
  const IconComponent = (Icons as any)[module.icon] || Icons.Package;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card p-6 transition-all duration-300",
      enabled ? "border-success/30 shadow-[0_0_20px_hsl(var(--success)/0.1)]" : "border-border opacity-75",
      module.status === 'coming-soon' && "opacity-50 pointer-events-none",
      className
    )}>
      {/* Status Badge */}
      {module.status !== 'stable' && (
        <Badge 
          variant="secondary" 
          className={cn(
            "absolute top-4 right-4 text-xs",
            module.status === 'beta' && "bg-age-blue/20 text-age-blue border-age-blue/30",
            module.status === 'coming-soon' && "bg-muted text-muted-foreground"
          )}
        >
          {module.status === 'beta' ? 'Beta' : 'Coming Soon'}
        </Badge>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          "rounded-xl p-3 shrink-0",
          enabled ? "gradient-primary" : "bg-muted"
        )}>
          <IconComponent className={cn(
            "h-6 w-6",
            enabled ? "text-white" : "text-muted-foreground"
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground">{module.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {module.description}
            </p>
          </div>

          {/* Pricing */}
          <div className="flex items-center gap-2">
            {module.pricing.type === 'included' && (
              <Badge variant="outline" className="text-success border-success/30">
                Included
              </Badge>
            )}
            {module.pricing.type === 'addon' && module.pricing.basePrice && (
              <Badge variant="outline">
                ${module.pricing.basePrice}/mo
              </Badge>
            )}
            {module.pricing.type === 'usage-based' && (
              <Badge variant="outline">
                Usage-based
              </Badge>
            )}
            {module.pricing.type === 'enterprise' && (
              <Badge variant="outline" className="text-age-gold border-age-gold/30">
                Enterprise
              </Badge>
            )}
          </div>

          {/* Features Preview */}
          <div className="flex flex-wrap gap-1">
            {module.features.slice(0, 3).map((feature) => (
              <span 
                key={feature} 
                className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
              >
                {feature}
              </span>
            ))}
            {module.features.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                +{module.features.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => onToggle(module.id, checked)}
            disabled={module.isCore || module.status === 'coming-soon'}
          />
          <span className="text-sm text-muted-foreground">
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>
            <Settings className="h-4 w-4 mr-1" />
            Configure
          </Button>
        </div>
      </div>
    </div>
  );
}
