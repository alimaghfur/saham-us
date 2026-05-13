import { Clock, Sparkles } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Card } from "./Card";

interface Props {
  title: string;
  description?: string;
  features?: string[];
}

export function ComingSoon({ title, description, features }: Props) {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title={title}
        description={description ?? "This module is on the roadmap."}
        badge="Coming Soon"
      />

      <div className="mx-auto max-w-2xl">
        <Card variant="glass" className="overflow-hidden">
          <div className="relative px-6 py-12 text-center">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Clock size={28} className="text-primary" />
              </div>

              <h2 className="text-lg font-bold">Under Development</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This feature is being built with care. Stay tuned for updates.
              </p>

              {features && features.length > 0 && (
                <div className="mt-8 text-left">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles size={12} className="text-primary" />
                    Planned Features
                  </h3>
                  <ul className="space-y-2">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-2.5 text-sm"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
