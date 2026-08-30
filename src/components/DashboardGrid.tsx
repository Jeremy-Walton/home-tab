import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { LinkTile } from "./LinkTile";
import { EmptyState } from "./EmptyState";
import { HoverIcon } from "./icons/HoverIcon";
import { Plus } from "./icons/plus";
import type { Link } from "../types";

interface DashboardGridProps {
  links: Link[];
  backgroundImageUrl?: string;
  onAddLink: () => void;
}

export function DashboardGrid({ links, backgroundImageUrl, onAddLink }: DashboardGridProps) {
  const sorted = [...links].sort((a, b) => a.order - b.order);

  return (
    <div
      className="flex min-w-0 flex-1 flex-col bg-cover bg-center p-6"
      style={{ backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined }}
    >
      {sorted.length === 0 ? (
        <EmptyState onAddLink={onAddLink} />
      ) : (
        <SortableContext items={sorted.map((l) => l.id)} strategy={rectSortingStrategy}>
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div className="mx-auto grid w-full max-w-[89rem] grid-cols-[repeat(auto-fill,14rem)] justify-center gap-4">
              {sorted.map((link) => (
                <LinkTile key={link.id} link={link} />
              ))}
              <button
                onClick={onAddLink}
                className="flex aspect-video w-56 items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-[color,border-color,scale] duration-150 ease-out-strong hover:border-ring hover:text-foreground motion-safe:active:scale-[0.98]"
                aria-label="Add link"
              >
                <HoverIcon icon={Plus} className="size-6" />
              </button>
            </div>
          </div>
        </SortableContext>
      )}
    </div>
  );
}
