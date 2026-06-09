import { Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showSuccess } from "@/utils/toast";
import type { ApplyMode, AssistantProposal } from "./types";

interface ReviewDialogProps {
  proposal: AssistantProposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (mode: ApplyMode) => void;
}

const ReviewDialog = ({ proposal, open, onOpenChange, onApply }: ReviewDialogProps) => {
  if (!proposal) {
    return null;
  }

  const handleCopy = () => {
    void navigator.clipboard.writeText(proposal.output);
    showSuccess("Proposal copied to clipboard.");
  };

  const applyModes: Array<{
    mode: ApplyMode;
    label: string;
    disabled?: boolean;
  }> = [
    {
      mode: "replace-selection",
      label: "Replace selection",
      disabled: !proposal.hasSelection,
    },
    {
      mode: "insert-cursor",
      label: "Insert at cursor",
    },
    {
      mode: "insert-below",
      label: "Insert below selection",
    },
    {
      mode: "insert-end",
      label: "Insert at end",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="space-y-3 border-b border-slate-200 p-6 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                Review before applying
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm">
                Nothing changes in your document until you approve the placement.
              </DialogDescription>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {proposal.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {proposal.summary}
            </p>
          </div>
        </DialogHeader>

        <div className="max-h-[44vh] overflow-auto p-6">
          <pre className="whitespace-pre-wrap break-words rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            {proposal.output}
          </pre>
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-slate-200 p-6 sm:flex-row dark:border-slate-800">
          <Button type="button" variant="outline" className="rounded-2xl" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy text
          </Button>

          <div className="flex flex-1 flex-wrap justify-end gap-2">
            {applyModes.map((item) => (
              <Button
                key={item.mode}
                type="button"
                variant={item.mode === "replace-selection" ? "default" : "secondary"}
                className="rounded-2xl"
                disabled={item.disabled}
                onClick={() => onApply(item.mode)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;