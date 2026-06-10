import * as React from "react";
import {
  Download,
  FileText,
  Import,
  Printer,
  Save,
  Sparkles,
  Trash2,
  BookOpen,
  Feather,
  WandSparkles,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  ListOrdered,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Link2,
  RemoveFormatting,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showSuccess } from "@/utils/toast";
import AssistantPanel from "@/components/writing-assistant/AssistantPanel";
import DocumentEditor from "@/components/writing-assistant/DocumentEditor";
import DocumentStats from "@/components/writing-assistant/DocumentStats";
import UploadBaseline from "@/components/writing-assistant/UploadBaseline";
import NovelistChat from "@/components/writing-assistant/NovelistChat";
import ReviewDialog from "@/components/writing-assistant/ReviewDialog";
import { generateAssistantProposal } from "@/components/writing-assistant/assistant-engine";
import { htmlToText, slugify, textToHtml } from "@/components/writing-assistant/editor-utils";
import {
  isSupportedTextFile,
  notifyUnsupportedFiles,
  readFileAsBaseline,
} from "@/components/writing-assistant/file-utils";
import { exportAsPdf, exportAsEpub } from "@/components/writing-assistant/export-utils";
import type { EditorCommand } from "@/components/writing-assistant/Toolbar";
import type {
  ApplyMode,
  AssistantRequest,
  BaselineDocument,
  DocumentEditorHandle,
  EditorSelectionState,
} from "@/components/writing-assistant/types";

const defaultDocumentHtml =
  "<h1>Untitled Document</h1><p>Your manuscript will appear here. Use the <strong>Novelist</strong> tab on the right to chat with your ghostwriter, or the <strong>Assistant</strong> tab for quick edits.</p>";

/* ─── Formatting icon config ─── */

const FORMAT_BUTTONS: { cmd: EditorCommand; label: string; icon: React.ElementType }[] = [
  { cmd: "undo", label: "Undo", icon: Undo2 },
  { cmd: "redo", label: "Redo", icon: Redo2 },
  { cmd: "bold", label: "Bold", icon: Bold },
  { cmd: "italic", label: "Italic", icon: Italic },
  { cmd: "underline", label: "Underline", icon: Underline },
  { cmd: "orderedList", label: "Numbered list", icon: ListOrdered },
  { cmd: "unorderedList", label: "Bulleted list", icon: List },
  { cmd: "justifyLeft", label: "Align left", icon: AlignLeft },
  { cmd: "justifyCenter", label: "Align center", icon: AlignCenter },
  { cmd: "justifyRight", label: "Align right", icon: AlignRight },
  { cmd: "blockquote", label: "Quote", icon: Quote },
  { cmd: "link", label: "Insert link", icon: Link2 },
  { cmd: "clearFormatting", label: "Clear formatting", icon: RemoveFormatting },
];

/* ─── Component ─── */

const Index = () => {
  const editorRef = React.useRef<DocumentEditorHandle>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [documentTitle, setDocumentTitle] = React.useState("Untitled Document");
  const [documentHtml, setDocumentHtml] = React.useState(defaultDocumentHtml);
  const [baselines, setBaselines] = React.useState<BaselineDocument[]>([]);
  const [selection, setSelection] = React.useState<EditorSelectionState>({ hasSelection: false, text: "", html: "" });
  const [proposal, setProposal] = React.useState<ReturnType<typeof generateAssistantProposal> | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  /* ─── Persistence ─── */
  React.useEffect(() => {
    const t = localStorage.getItem("ai-writing-assistant-document-title-v1");
    const d = localStorage.getItem("ai-writing-assistant-document-html-v1");
    const b = localStorage.getItem("ai-writing-assistant-baselines-v1");
    if (t) setDocumentTitle(t);
    if (d !== null) setDocumentHtml(d);
    if (b) setBaselines(JSON.parse(b));
  }, []);

  React.useEffect(() => { localStorage.setItem("ai-writing-assistant-document-title-v1", documentTitle); }, [documentTitle]);
  React.useEffect(() => { localStorage.setItem("ai-writing-assistant-document-html-v1", documentHtml); }, [documentHtml]);
  React.useEffect(() => { localStorage.setItem("ai-writing-assistant-baselines-v1", JSON.stringify(baselines)); }, [baselines]);

  /* ─── Handlers ─── */
  const runCmd = React.useCallback((cmd: EditorCommand) => editorRef.current?.runCommand(cmd), []);
  const handleSelectionChange = React.useCallback((s: EditorSelectionState) => setSelection(s), []);

  const handleCreateProposal = React.useCallback((request: AssistantRequest) => {
    setProposal(generateAssistantProposal(request));
    setReviewOpen(true);
    showSuccess("Proposal ready.");
  }, []);

  const handleApplyProposal = React.useCallback((mode: ApplyMode) => {
    if (!proposal) return;
    const html = textToHtml(proposal.output);
    if (mode === "replace-selection") editorRef.current?.replaceSelection(html);
    if (mode === "insert-cursor") editorRef.current?.insertAtCursor(html);
    if (mode === "insert-below") editorRef.current?.insertBelowSelection(html);
    if (mode === "insert-end") editorRef.current?.insertAtEnd(html);
    setProposal(null);
    setReviewOpen(false);
    showSuccess("Proposal applied.");
  }, [proposal]);

  const handleAddBaselines = React.useCallback((docs: BaselineDocument[]) => {
    setBaselines((c) => [...docs, ...c]);
    showSuccess(`${docs.length} baseline${docs.length === 1 ? "" : "s"} added.`);
  }, []);
  const handleRemoveBaseline = React.useCallback((id: string) => setBaselines((c) => c.filter((d) => d.id !== id)), []);
  const handleClearBaselines = () => {
    if (!window.confirm("Remove all uploaded baseline documents?")) return;
    setBaselines([]);
    showSuccess("Baselines cleared.");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    if (!isSupportedTextFile(file)) { notifyUnsupportedFiles(); e.currentTarget.value = ""; return; }
    const imported = await readFileAsBaseline(file);
    setDocumentTitle(imported.name.replace(/\.[^.]+$/, "") || "Imported Document");
    setDocumentHtml(textToHtml(imported.text));
    showSuccess("Document imported.");
    e.currentTarget.value = "";
  };

  const handleExport = async (format: "txt" | "html" | "pdf" | "epub") => {
    const html = editorRef.current?.getHtml() || documentHtml;
    const text = htmlToText(html);
    const fileName = slugify(documentTitle);
    if (format === "txt") {
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${fileName}.txt`; a.click(); URL.revokeObjectURL(url);
    } else if (format === "html") {
      const blob = new Blob([`<!doctype html><html lang="en"><head><meta charset="UTF-8"/><title>${documentTitle}</title></head><body>${html}</body></html>`], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${fileName}.html`; a.click(); URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      await exportAsPdf(documentTitle, html);
    } else if (format === "epub") {
      await exportAsEpub(documentTitle, text);
    }
    showSuccess(`Exported as ${format.toUpperCase()}.`);
  };

  const novelChapterGenerated = React.useCallback((text: string, num: number) => {
    editorRef.current?.insertAtEnd(textToHtml(text));
    showSuccess(`Chapter ${num} drafted and inserted.`);
  }, []);

  /* ─── Render ─── */
  return (
    <div className="h-screen w-full flex flex-row overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* ═══════════ LEFT PANE: WORD PROCESSOR ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-gray-950">
        {/* ── UNIFIED TOP TOOLBAR ── */}
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            {/* Brand */}
            <div className="hidden items-center gap-2 lg:flex mr-2">
              <img src="/liberai.png" alt="LiberAI" className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">LiberAI</span>
            </div>

            <Separator orientation="vertical" className="h-6 hidden lg:block" />

            {/* ── Left: formatting ── */}
            <div className="flex items-center gap-1 flex-wrap">
              <Select onValueChange={(v) => runCmd(v as EditorCommand)}>
                <SelectTrigger className="h-8 w-[110px] rounded-lg border-gray-200 text-xs dark:border-gray-700">
                  <SelectValue placeholder="Paragraph" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paragraph">Paragraph</SelectItem>
                  <SelectItem value="h1">Heading 1</SelectItem>
                  <SelectItem value="h2">Heading 2</SelectItem>
                  <SelectItem value="blockquote">Quote</SelectItem>
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-5" />

              {FORMAT_BUTTONS.map(({ cmd, label, icon: Icon }) => (
                <Tooltip key={cmd}>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => runCmd(cmd)}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="sr-only">{label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* ── Right: document actions ── */}
            <div className="flex items-center gap-1 flex-wrap">
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => showSuccess("Saved locally.")}>
                <Save className="mr-1 h-3.5 w-3.5" /> Save
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => importInputRef.current?.click()}>
                <Import className="mr-1 h-3.5 w-3.5" /> Import
              </Button>
              <input ref={importInputRef} type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" className="hidden" onChange={handleImport} />
              <Separator orientation="vertical" className="h-5" />
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => handleExport("txt")}>
                <Download className="mr-1 h-3.5 w-3.5" /> TXT
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => handleExport("html")}>
                <FileText className="mr-1 h-3.5 w-3.5" /> HTML
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => handleExport("pdf")}>
                <Printer className="mr-1 h-3.5 w-3.5" /> PDF
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => handleExport("epub")}>
                <BookOpen className="mr-1 h-3.5 w-3.5" /> EPUB
              </Button>
              <Separator orientation="vertical" className="h-5" />
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-red-500 hover:text-red-600" onClick={() => {
                if (!window.confirm("Clear the current document?")) return;
                setDocumentHtml("");
                showSuccess("Document cleared.");
                setTimeout(() => editorRef.current?.focus(), 0);
              }}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>
        </header>

        {/* ── DOCUMENT TITLE ── */}
        <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-2 dark:border-gray-800 dark:bg-gray-950">
          <input
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="w-full bg-transparent text-lg font-bold text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
            placeholder="Untitled Document"
          />
        </div>

        {/* ── WRITING CANVAS (scrollable) ── */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
          <div className="mx-auto max-w-3xl w-full px-6 py-6">
            <DocumentEditor
              ref={editorRef}
              initialHtml={documentHtml}
              onChange={setDocumentHtml}
              onSelectionChange={handleSelectionChange}
            />
          </div>
        </div>

        {/* ── STATS FOOTER ── */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-1.5 dark:border-gray-800 dark:bg-gray-950">
          <DocumentStats html={documentHtml} selectedText={selection.text} />
        </div>
      </div>

      {/* ═══════════ RIGHT PANE: AI ASSISTANT (tabbed) ═══════════ */}
      <aside className="w-[400px] shrink-0 flex flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <Tabs defaultValue="novelist" className="flex flex-col h-full">
          {/* Tab bar */}
          <div className="shrink-0 border-b border-gray-200 px-3 pt-2 pb-0 dark:border-gray-700">
            <TabsList className="h-8 w-full rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
              <TabsTrigger value="novelist" className="flex-1 gap-1 rounded-md px-2 py-1 text-[11px] data-[state=active]:bg-white data-[state=active]:text-purple-700 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-purple-300">
                <Feather className="h-3 w-3" /> Novelist
              </TabsTrigger>
              <TabsTrigger value="assistant" className="flex-1 gap-1 rounded-md px-2 py-1 text-[11px] data-[state=active]:bg-white data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-emerald-300">
                <WandSparkles className="h-3 w-3" /> Assistant
              </TabsTrigger>
              <TabsTrigger value="baselines" className="flex-1 gap-1 rounded-md px-2 py-1 text-[11px] data-[state=active]:bg-white data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-indigo-300">
                <BookOpen className="h-3 w-3" /> Baselines
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="novelist" className="flex-1 flex flex-col overflow-hidden pt-0 mt-0 data-[state=inactive]:hidden">
            <NovelistChat
              onChapterGenerated={novelChapterGenerated}
              editorDocumentText={htmlToText(documentHtml)}
              editorChapterCount={(documentHtml.match(/(?:<h1[^>]*>|<h2[^>]*>|^#+\s)/gim) || []).length}
              editorWordCount={htmlToText(documentHtml).trim().split(/\s+/).filter(Boolean).length}
            />
          </TabsContent>

          <TabsContent value="assistant" className="flex-1 overflow-auto pt-0 mt-0 data-[state=inactive]:hidden p-3">
            <AssistantPanel
              selectedText={selection.text}
              documentText={htmlToText(documentHtml)}
              baselines={baselines}
              onCreateProposal={handleCreateProposal}
            />
          </TabsContent>

          <TabsContent value="baselines" className="flex-1 overflow-auto pt-0 mt-0 data-[state=inactive]:hidden p-3">
            <UploadBaseline
              baselines={baselines}
              onAdd={handleAddBaselines}
              onRemove={handleRemoveBaseline}
              onClear={handleClearBaselines}
            />
          </TabsContent>
        </Tabs>
      </aside>

      {/* Review dialog */}
      <ReviewDialog proposal={proposal} open={reviewOpen} onOpenChange={setReviewOpen} onApply={handleApplyProposal} />
    </div>
  );
};

export default Index;