import * as React from "react";
import { Download, FileText, Import, Printer, Save, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { showSuccess } from "@/utils/toast";
import AssistantPanel from "@/components/writing-assistant/AssistantPanel";
import DocumentEditor from "@/components/writing-assistant/DocumentEditor";
import DocumentStats from "@/components/writing-assistant/DocumentStats";
import Toolbar, { type EditorCommand } from "@/components/writing-assistant/Toolbar";
import UploadBaseline from "@/components/writing-assistant/UploadBaseline";
import ReviewDialog from "@/components/writing-assistant/ReviewDialog";
import { generateAssistantProposal } from "@/components/writing-assistant/assistant-engine";
import {
  STORAGE_KEYS,
  htmlToText,
  slugify,
  textToHtml,
} from "@/components/writing-assistant/editor-utils";
import {
  isSupportedTextFile,
  notifyUnsupportedFiles,
  readFileAsText,
} from "@/components/writing-assistant/file-utils";
import type {
  ApplyMode,
  AssistantRequest,
  BaselineDocument,
  DocumentEditorHandle,
  EditorSelectionState,
} from "@/components/writing-assistant/types";

const defaultDocumentHtml = "<h1>Untitled document</h1><p>Start writing your piece here.</p>";

const Index = () => {
  const editorRef = React.useRef<DocumentEditorHandle>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [documentTitle, setDocumentTitle] = React.useState("Untitled document");
  const [documentHtml, setDocumentHtml] = React.useState(defaultDocumentHtml);
  const [baselines, setBaselines] = React.useState<BaselineDocument[]>([]);
  const [selection, setSelection] = React.useState<EditorSelectionState>({
    hasSelection: false,
    text: "",
    html: "",
  });
  const [proposal, setProposal] = React.useState<ReturnType<typeof generateAssistantProposal> | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  React.useEffect(() => {
    const savedTitle = localStorage.getItem(STORAGE_KEYS.documentTitle);
    const savedDocument = localStorage.getItem(STORAGE_KEYS.document);
    const savedBaselines = localStorage.getItem(STORAGE_KEYS.baselines);

    if (savedTitle) {
      setDocumentTitle(savedTitle);
    }

    if (savedDocument !== null) {
      setDocumentHtml(savedDocument);
    }

    if (savedBaselines) {
      setBaselines(JSON.parse(savedBaselines));
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.documentTitle, documentTitle);
  }, [documentTitle]);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.document, documentHtml);
  }, [documentHtml]);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.baselines, JSON.stringify(baselines));
  }, [baselines]);

  const handleSelectionChange = React.useCallback((nextSelection: EditorSelectionState) => {
    setSelection(nextSelection);
  }, []);

  const handleEditorCommand = React.useCallback((command: EditorCommand) => {
    editorRef.current?.runCommand(command);
  }, []);

  const handleCreateProposal = React.useCallback((request: AssistantRequest) => {
    const generatedProposal = generateAssistantProposal(request);
    setProposal(generatedProposal);
    setReviewOpen(true);
    showSuccess("Proposal ready. Review it before applying.");
  }, []);

  const handleApplyProposal = React.useCallback(
    (mode: ApplyMode) => {
      if (!proposal) {
        return;
      }

      const html = textToHtml(proposal.output);

      if (mode === "replace-selection") {
        editorRef.current?.replaceSelection(html);
      }

      if (mode === "insert-cursor") {
        editorRef.current?.insertAtCursor(html);
      }

      if (mode === "insert-below") {
        editorRef.current?.insertBelowSelection(html);
      }

      if (mode === "insert-end") {
        editorRef.current?.insertAtEnd(html);
      }

      setProposal(null);
      setReviewOpen(false);
      showSuccess("Assistant proposal applied.");
    },
    [proposal],
  );

  const handleAddBaselines = React.useCallback((documents: BaselineDocument[]) => {
    setBaselines((current) => [...documents, ...current]);
    showSuccess(`${documents.length} baseline ${documents.length === 1 ? "document" : "documents"} added.`);
  }, []);

  const handleRemoveBaseline = React.useCallback((id: string) => {
    setBaselines((current) => current.filter((document) => document.id !== id));
  }, []);

  const handleClearBaselines = () => {
    if (!window.confirm("Remove all uploaded baseline documents?")) {
      return;
    }

    setBaselines([]);
    showSuccess("Baseline documents cleared.");
  };

  const handleImportDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    if (!isSupportedTextFile(file)) {
      notifyUnsupportedFiles();
      event.currentTarget.value = "";
      return;
    }

    const imported = await readFileAsText(file);
    setDocumentTitle(imported.name.replace(/\.[^.]+$/, "") || "Imported document");
    setDocumentHtml(textToHtml(imported.text));
    showSuccess("Document imported.");
    event.currentTarget.value = "";
  };

  const handleExport = (format: "txt" | "html") => {
    const html = editorRef.current?.getHtml() || documentHtml;
    const text = htmlToText(html);
    const fileName = slugify(documentTitle);

    const content =
      format === "html"
        ? `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${documentTitle}</title>
</head>
<body>
${html}
</body>
</html>`
        : text;

    const blob = new Blob([content], {
      type: format === "html" ? "text/html" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${fileName}.${format}`;
    link.click();
    URL.revokeObjectURL(url);

    showSuccess(`Document exported as ${format.toUpperCase()}.`);
  };

  const handleNewDocument = () => {
    if (!window.confirm("Start a new document? Your current document is saved locally, but the editor will be cleared.")) {
      return;
    }

    setDocumentTitle("Untitled document");
    setDocumentHtml(defaultDocumentHtml);
    showSuccess("New document ready.");
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const handleClearDocument = () => {
    if (!window.confirm("Clear the current document? Baseline uploads will stay intact.")) {
      return;
    }

    setDocumentHtml("");
    showSuccess("Document cleared.");
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">AI Writing Assistant</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Prompt first. Review every change. Keep your voice as context.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Word processor
            </Badge>
            <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Baseline uploads
            </Badge>
            <Badge className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Autosaves locally
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-6">
        <section className="space-y-4">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <Input
                    value={documentTitle}
                    onChange={(event) => setDocumentTitle(event.target.value)}
                    className="h-12 border-0 bg-transparent px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0"
                  />
                  <CardDescription className="mt-2">
                    A full writing workspace with formatting, import/export, and assistant proposals.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => showSuccess("Saved locally.")}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => importInputRef.current?.click()}
                  >
                    <Import className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => handleExport("txt")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => handleExport("html")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    HTML
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => window.print()}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-2xl"
                    onClick={handleClearDocument}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>

                <input
                  ref={importInputRef}
                  type="file"
                  accept=".txt,.md,.markdown,.csv,.json,text/plain,text/markdown,text/csv,application/json"
                  className="hidden"
                  onChange={handleImportDocument}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Toolbar selectedText={selection.text} onCommand={handleEditorCommand} />
              <DocumentEditor
                ref={editorRef}
                initialHtml={documentHtml}
                onChange={setDocumentHtml}
                onSelectionChange={handleSelectionChange}
              />
              <Separator />
              <DocumentStats html={documentHtml} selectedText={selection.text} />
            </CardContent>
          </Card>

          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-2xl"
            onClick={handleNewDocument}
          >
            Start a fresh document
          </Button>
        </section>

        <aside className="space-y-4">
          <AssistantPanel
            selectedText={selection.text}
            documentText={htmlToText(documentHtml)}
            baselines={baselines}
            onCreateProposal={handleCreateProposal}
          />
          <UploadBaseline
            baselines={baselines}
            onAdd={handleAddBaselines}
            onRemove={handleRemoveBaseline}
            onClear={handleClearBaselines}
          />
        </aside>
      </main>

      <ReviewDialog
        proposal={proposal}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onApply={handleApplyProposal}
      />
    </div>
  );
};

export default Index;