import { useState } from "react";

import { useAppState } from "../context/useAppState";
import { useClosingDialog } from "../hooks/useClosingDialog";
import type { SyncStatus } from "../storage/sync";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "./ui/field";
import { Input } from "./ui/input";

const STATUS_LABELS: Record<SyncStatus, string> = {
  standby: "Syncing through another open tab",
  connecting: "Connecting…",
  connected: "Connected",
  offline: "Offline, retrying…",
};

export function SyncDialog({ onExport, onClose }: { onExport: () => void; onClose: () => void }) {
  const { syncKey, syncStatus, createSyncKey, checkSyncKey, joinSyncKey, stopSync } = useAppState();
  const { close, dialogProps } = useClosingDialog(onClose);
  const [keyInput, setKeyInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleJoin() {
    setChecking(true);
    try {
      setVerifiedKey(await checkSyncKey(keyInput));
      setJoinError(null);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Could not check that key.");
    } finally {
      setChecking(false);
    }
  }

  async function handleCopy() {
    if (!syncKey) return;
    await navigator.clipboard.writeText(syncKey);
    setCopied(true);
  }

  if (syncKey) {
    return (
      <Dialog {...dialogProps}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync</DialogTitle>
            <DialogDescription>
              Browsers using this key share the same dashboards and links. Anyone with the key can
              see and change them.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sync-key">Sync key</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="sync-key"
                  readOnly
                  value={syncKey}
                  className="font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <Button variant="outline" onClick={() => void handleCopy()}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <FieldDescription>
                Status: {syncStatus ? STATUS_LABELS[syncStatus] : "Starting…"}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => void stopSync()}>
              Stop syncing
            </Button>
            <Button onClick={() => close()}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (verifiedKey) {
    return (
      <Dialog {...dialogProps}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace this browser's data?</DialogTitle>
            <DialogDescription>
              Joining replaces the dashboards and links in this browser with the synced ones.
              Download a backup first if you want to keep them.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={onExport}>
              Download backup
            </Button>
            <Button variant="outline" onClick={() => setVerifiedKey(null)}>
              Cancel
            </Button>
            <Button onClick={() => joinSyncKey(verifiedKey)}>Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog {...dialogProps}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync</DialogTitle>
          <DialogDescription>
            Share your dashboards between browsers. No account needed: anyone with the sync key can
            see and change the synced data.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleJoin();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldTitle>Start syncing this browser</FieldTitle>
              <Button type="button" variant="outline" onClick={createSyncKey}>
                Create sync key
              </Button>
            </Field>

            <Field data-invalid={joinError ? true : undefined}>
              <FieldLabel htmlFor="sync-join-key">
                Or join with a key from another browser
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="sync-join-key"
                  value={keyInput}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="font-mono"
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <Button type="submit" disabled={checking || keyInput.trim() === ""}>
                  Join
                </Button>
              </div>
              <FieldError>{joinError}</FieldError>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
