import * as React from "react";
import { WandSparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { excerpt } from "./editor-utils";
import type { AssistantRequest, Intent, LengthPreference, Tone } from "./types";
import type { BaselineDocument } from "./types";

interface AssistantPanelProps {
  selectedText: string;
  documentText: string;
  baselines: BaselineDocument[];
  onCreateProposal: (request: AssistantRequest) => void;
}

const AssistantPanel = ({
  selectedText,
  documentText,
  baselines,
  onCreateProposal,
}: AssistantPanelProps) => {
  const [intent, setIntent] = React.useState<Intent>("rewrite");
  const [tone, setTone] = React.useState<Tone>("professional");
  const [length, setLength] = React.useState<LengthPreference>("same");
  const [customPrompt, setCustomPrompt] = React.useState("");
  const [useBaseline, setUseBaseline] = React.useState(false);
  const [outlineText, setOutlineText] = React.useState("");

  React.useEffect(() => {
    setUseBaseline(baselines.length > 0);
  }, [baselines.length]);

  const baselineText = baselines
    .map((document) => `### ${document.name}\n${document.text}`)
    .join("\n\n");

  const selectedWordCount = selectedText.trim().split(/\s+/).filter(Boolean).length;
  const canGenerate = intent !== "custom" || customPrompt.trim().length > 0;

  const handleGenerate = () => {
    onCreateProposal({
      intent,
      tone,
      length,
      customPrompt: customPrompt.trim(),
      selectedText,
      documentText,
      baselineText,
      useBaseline: useBaseline && baselines.length > 0,
    });
  };

  const generateChapter = () => {
    if (!outlineText.trim()) return;
    const request: AssistantRequest = {
      intent: "custom",
      customPrompt: "Generate a chapter based on this outline: " + outlineText,
      selectedText: outlineText,
      documentText: "",
      tone,
      length,
      useBaseline: false,
    };
    onCreateProposal(request);
  };

  return (
    <Card className="overflow-hidden border-emerald-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <WandSparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Prompt-first assistant</CardTitle>
              <CardDescription>
                Choose the outcome, review a proposal, then approve where it goes.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-900 dark:text-white">
            Intent
          </label>
          <Select value={intent} onValueChange={(value) => setIntent(value as Intent)}>
            <SelectTrigger className="mt-2 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rewrite">Rewrite</SelectItem>
              <SelectItem value="clarify">Clarify</SelectItem>
              <SelectItem value="tone">Tone shift</SelectItem>
              <SelectItem value="summarize">Summarize</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="continue">Continue</SelectItem>
              <SelectItem value="title">Titles</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900 dark:text-white">
            Tone
          </label>
          <Select value={tone} onValueChange={(value) => setTone(value as Tone)}>
            <SelectTrigger className="mt-2 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="persuasive">Persuasive</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-900 dark:text-white">
            Length
          </label>
          <Select value={length} onValueChange={(value) => setLength(value as LengthPreference)}>
            <SelectTrigger className="mt-2 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shorter">Shorter</SelectItem>
              <SelectItem value="same">Same</SelectItem>
              <SelectItem value="longer">Longer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {intent === "custom" && (
          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Custom prompt
            </label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe what you want the assistant to do..."
              className="mt-2 min-h-24 rounded-xl"
            />
          </div>
        )}

        {baselines.length > 0 && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Use baseline context
            </label>
            <Switch checked={useBaseline} onCheckedChange={setUseBaseline} />
          </div>
        )}

        <Button
          type="button"
          className="w-full rounded-2xl bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700"
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          Generate proposal
        </Button>

        <Separator className="bg-slate-200 dark:bg-slate-800" />

        {/* Chapter Outline section for long-form writing */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900 dark:text-white">
            Chapter Outline
          </label>
          <Textarea
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            placeholder="Enter chapter outline (one paragraph per line or numbered list)"
            className="min-h-28 rounded-2xl"
          />
          <Button
            type="button"
            className="w-full rounded-2xl bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700"
            onClick={generateChapter}
            disabled={!outlineText.trim()}
          >
            Generate Chapter
          </Button>
        </div>

        {selectedText && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
              {selectedWordCount} words selected. The assistant will use this as context.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AssistantPanel;