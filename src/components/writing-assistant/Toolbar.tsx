import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Type,
  Underline,
  Undo2,
  Italic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { countWords } from "./editor-utils";

export type EditorCommand =
  | "undo"
  | "redo"
  | "bold"
  | "italic"
  | "underline"
  | "h1"
  | "h2"
  | "paragraph"
  | "blockquote"
  | "orderedList"
  | "unorderedList"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight"
  | "link"
  | "clearFormatting";

interface ToolbarProps {
  selectedText: string;
  onCommand: (command: EditorCommand) => void;
}

const iconCommands: Array<{
  command: EditorCommand;
  label: string;
  icon: React.ElementType;
}> = [
  { command: "undo", label: "Undo", icon: Undo2 },
  { command: "redo", label: "Redo", icon: Redo2 },
  { command: "bold", label: "Bold", icon: Bold },
  { command: "italic", label: "Italic", icon: Italic },
  { command: "underline", label: "Underline", icon: Underline },
  { command: "orderedList", label: "Numbered list", icon: ListOrdered },
  { command: "unorderedList", label: "Bulleted list", icon: List },
  { command: "justifyLeft", label: "Align left", icon: AlignLeft },
  { command: "justifyCenter", label: "Align center", icon: AlignCenter },
  { command: "justifyRight", label: "Align right", icon: AlignRight },
  { command: "blockquote", label: "Quote", icon: Quote },
  { command: "link", label: "Insert link", icon: Link2 },
  { command: "clearFormatting", label: "Clear formatting", icon: RemoveFormatting },
];

const Toolbar = ({ selectedText, onCommand }: ToolbarProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select onValueChange={(value) => onCommand(value as EditorCommand)}>
          <SelectTrigger className="h-10 w-full max-w-[220px] rounded-xl border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950">
            <SelectValue placeholder="Paragraph" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="blockquote">Quote</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-1">
          {iconCommands.map((item) => {
            const Icon = item.icon;

            return (
              <Tooltip key={item.command}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => onCommand(item.command)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="sr-only">{item.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <Type className="h-4 w-4" />
          {selectedText
            ? `${countWords(selectedText)} selected`
            : "No text selected"}
        </div>
      </div>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Format directly, then use the assistant whenever you want a proposed rewrite,
        outline, summary, or continuation.
      </p>
    </div>
  );
};

export default Toolbar;