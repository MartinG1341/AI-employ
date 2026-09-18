import type { LucideIcon } from "lucide-react";
export function SectionHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) { return <div className="workspace-heading">{eyebrow && <span className="overline">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>; }
export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) { return <div className="workspace-empty"><Icon size={20}/><h3>{title}</h3><p>{description}</p></div>; }
