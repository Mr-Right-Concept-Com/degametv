import { AdminLayout } from '@/components/admin/AdminLayout';
import { ModuleCard } from '@/components/admin/ModuleCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/hooks/useTenant';
import { MODULE_DEFINITIONS, ModuleId, Module, getModulesByCategory } from '@/types/modules';

export default function ModulesPage() {
  const { isModuleEnabled, enableModule, disableModule } = useTenant();

  const handleModuleToggle = (moduleId: ModuleId, enabled: boolean) => {
    if (enabled) {
      enableModule(moduleId);
    } else {
      disableModule(moduleId);
    }
  };

  const categories = [
    { id: 'all', label: `All (${MODULE_DEFINITIONS.length} Modules)` },
    { id: 'content', label: 'Content' },
    { id: 'streaming', label: 'Streaming' },
    { id: 'commerce', label: 'Commerce' },
    { id: 'platform', label: 'Platform' },
    { id: 'future', label: 'Future' },
  ];

  return (
    <AdminLayout
      title="Modules"
      description="Enable and configure platform modules"
    >
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-secondary/50">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULE_DEFINITIONS.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                enabled={isModuleEnabled(module.id)}
                onToggle={handleModuleToggle}
              />
            ))}
          </div>
        </TabsContent>

        {(['content', 'streaming', 'commerce', 'platform', 'future'] satisfies Module['category'][]).map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getModulesByCategory(category).map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  enabled={isModuleEnabled(module.id)}
                  onToggle={handleModuleToggle}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  );
}
