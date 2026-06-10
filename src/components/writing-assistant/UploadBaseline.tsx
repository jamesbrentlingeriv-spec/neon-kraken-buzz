import * as React from "react";
import { BookOpen, FileUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isSupportedTextFile, notifyUnsupportedFiles, readFileAsBaseline } from "./file-utils";
import type { BaselineDocument } from "./types";

interface UploadBaselineProps {
  baselines: BaselineDocument[];
  onAdd: (documents: BaselineDocument[]) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const UploadBaseline = ({
  baselines,
  onAdd,
  onRemove,
  onClear,
}: UploadBaselineProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    const supportedFiles = files.filter(isSupportedTextFile);

    if (!supportedFiles.length) {
      notifyUnsupportedFiles();
      event.currentTarget.value = "";
      return;
    }

    const documents = await Promise.all(supportedFiles.map(readFileAsBaseline));
    onAdd(documents);
    event.currentTarget.value = "";
  };

  return (
    <Card className="overflow-hidden border-indigo-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Previous work</CardTitle>
              <CardDescription>
                Upload past writing (PDF or EPUB) so the assistant can use it as baseline context.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{baselines.length}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl bg-indigo-600 font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <FileUp className="mr-2 h-4 w-4" />
          Upload .epub or .pdf
        </Button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".epub,.pdf,application/epub+zip,application/pdf"
          className="hidden"
          onChange={handleFiles}
        />

        {baselines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            No baseline documents yet. Upload a PDF or EPUB file.
          </div>
        ) : (
          <div className="space-y-3">
            <ScrollArea className="h-56 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-2 p-3">
                {baselines.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {document.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {document.wordCount.toLocaleString()} words
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-xl"
                      onClick={() => onRemove(document.id)}
                    >
                      <Trash2 className="h-4 w-4 text-slate-500" />
                      <span className="sr-only">Remove baseline</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl"
              onClick={onClear}
            >
              Clear baseline documents
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadBaseline;