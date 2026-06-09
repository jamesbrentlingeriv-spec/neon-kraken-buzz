import { Card, CardContent } from "@/components/ui/card";
import { countWords, readingTimeMinutes } from "./editor-utils";

interface DocumentStatsProps {
  html: string;
  selectedText: string;
}

const DocumentStats = ({ html, selectedText }: DocumentStatsProps) => {
  const text = html.replace(/<[^>]*>/g, " ");
  const wordCount = countWords(text);
  const charCount = text.replace(/\s+/g, "").length;
  const selectedWordCount = countWords(selectedText);

  const stats = [
    { label: "Words", value: wordCount.toLocaleString() },
    { label: "Characters", value: charCount.toLocaleString() },
    { label: "Read time", value: `${readingTimeMinutes(wordCount)} min` },
    { label: "Selected", value: selectedWordCount.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/70 bg-white/80 shadow-sm dark:bg-slate-950/60">
          <CardContent className="p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
              {stat.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DocumentStats;