import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  variant = 'default',
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card p-6 shadow-card",
      variant === 'primary' && "border-primary/30 bg-primary/5",
      variant === 'success' && "border-success/30 bg-success/5",
      variant === 'warning' && "border-warning/30 bg-warning/5",
      variant === 'destructive' && "border-destructive/30 bg-destructive/5",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive && <TrendingUp className="h-4 w-4 text-success" />}
              {isNegative && <TrendingDown className="h-4 w-4 text-destructive" />}
              {isNeutral && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className={cn(
                "text-sm font-medium",
                isPositive && "text-success",
                isNegative && "text-destructive",
                isNeutral && "text-muted-foreground"
              )}>
                {isPositive && '+'}{change}%
              </span>
              {changeLabel && (
                <span className="text-sm text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            "rounded-lg p-2.5",
            variant === 'default' && "bg-muted",
            variant === 'primary' && "bg-primary/10 text-primary",
            variant === 'success' && "bg-success/10 text-success",
            variant === 'warning' && "bg-warning/10 text-warning",
            variant === 'destructive' && "bg-destructive/10 text-destructive"
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
