import { useRef, useState, useEffect } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./MarkdownContent";
import "@uiw/react-md-editor/markdown-editor.css";

function MarkdownPreview({ value }) {
  return (
    <div className="min-h-[400px] rounded-lg border border-border bg-background p-6 shadow-sm">
      {value?.trim() ? (
        <MarkdownContent content={value} />
      ) : (
        <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
      )}
    </div>
  );
}

export default function LessonMarkdownEditor({ value, onChange }) {
  const [tab, setTab] = useState("write");
  const [importing, setImporting] = useState(false);
  const [colorMode, setColorMode] = useState("dark");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    const update = () =>
      setColorMode(root.classList.contains("light") ? "light" : "dark");
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      value?.trim() &&
      !confirm(
        "Replace the current lesson content with the imported markdown file?",
      )
    ) {
      event.target.value = "";
      return;
    }

    setImporting(true);

    try {
      const importedContent = await file.text();
      onChange(importedContent);
      setTab("write");
    } catch {
      alert("Failed to import markdown file.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === "write" ? "default" : "outline"}
          onClick={() => setTab("write")}
        >
          Write
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "preview" ? "default" : "outline"}
          onClick={() => setTab("preview")}
        >
          Preview
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleImportClick}
          disabled={importing}
        >
          {importing ? "Importing..." : "Import .md"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          className="hidden"
          onChange={handleFileImport}
        />
      </div>

      {tab === "write" ? (
        <div className="lesson-md-editor" data-color-mode={colorMode}>
          <MDEditor
            value={value}
            onChange={(next) => onChange(next ?? "")}
            preview="edit"
            hideToolbar
            visibleDragbar={false}
            height={400}
            textareaProps={{
              placeholder: "Write the lesson in markdown...",
            }}
          />
        </div>
      ) : (
        <MarkdownPreview value={value} />
      )}
    </div>
  );
}
