import { HoverIcon } from "./icons/HoverIcon";
import { Plus } from "./icons/plus";
import { Button } from "./ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";

export function EmptyState({ onAddLink }: { onAddLink: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Empty className="w-80 flex-none border bg-card/90 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out-strong">
        <EmptyHeader>
          <EmptyTitle>Welcome to Launch Tabs!</EmptyTitle>
          <EmptyDescription>Add your first link to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="w-full" onClick={onAddLink}>
            <HoverIcon icon={Plus} /> Add link
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
