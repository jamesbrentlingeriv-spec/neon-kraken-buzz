import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  DocumentEditorHandle,
  EditorSelectionState,
} from "./types";
import type { EditorCommand } from "./Toolbar";

interface DocumentEditorProps {
  initialHtml: string;
  className?: string;
  onChange: (html: string) => void;
  onSelectionChange: (selection: EditorSelectionState) => void;
}

const emptySelection: EditorSelectionState = {
  hasSelection: false,
  text: "",
  html: "",
};

const DocumentEditor = React.forwardRef<DocumentEditorHandle, DocumentEditorProps>(
  ({ initialHtml, className, onChange, onSelectionChange }, ref) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const htmlRef = React.useRef(initialHtml);

    const emitChange = React.useCallback(() => {
      const nextHtml = editorRef.current?.innerHTML || "";
      htmlRef.current = nextHtml;
      onChange(nextHtml);
    }, [onChange]);

    const updateSelectionState = React.useCallback(() => {
      const selection = window.getSelection();
      const editor = editorRef.current;

      if (!selection || selection.rangeCount === 0 || !editor) {
        onSelectionChange(emptySelection);
        return;
      }

      const range = selection.getRangeAt(0);

      if (!editor.contains(range.commonAncestorContainer)) {
        onSelectionChange(emptySelection);
        return;
      }

      const text = selection.toString();
      const fragment = document.createDocumentFragment();
      fragment.appendChild(range.cloneContents());

      const temp = document.createElement("div");
      temp.appendChild(fragment);

      onSelectionChange({
        hasSelection: text.length > 0,
        text,
        html: temp.innerHTML,
      });
    }, [onSelectionChange]);

    const insertHtmlAtRange = (range: Range, html: string) => {
      const temp = document.createElement("div");
      temp.innerHTML = html;

      const fragment = document.createDocumentFragment();

      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }

      range.deleteContents();
      range.insertNode(fragment);
      range.collapse(false);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    };

    const replaceSelection = React.useCallback(
      (html: string) => {
        const editor = editorRef.current;
        const selection = window.getSelection();

        if (!editor || !selection || selection.rangeCount === 0) {
          insertAtCursor(html);
          return;
        }

        const range = selection.getRangeAt(0);

        if (!editor.contains(range.commonAncestorContainer)) {
          insertAtEnd(html);
          return;
        }

        insertHtmlAtRange(range, html);
        emitChange();
        updateSelectionState();
      },
      [emitChange, updateSelectionState],
    );

    const insertAtCursor = React.useCallback(
      (html: string) => {
        const editor = editorRef.current;
        const selection = window.getSelection();

        if (!editor || !selection || selection.rangeCount === 0) {
          insertAtEnd(html);
          return;
        }

        const range = selection.getRangeAt(0);

        if (!editor.contains(range.commonAncestorContainer)) {
          insertAtEnd(html);
          return;
        }

        insertHtmlAtRange(range, html);
        emitChange();
        updateSelectionState();
      },
      [emitChange, updateSelectionState],
    );

    const insertBelowSelection = React.useCallback(
      (html: string) => {
        const editor = editorRef.current;
        const selection = window.getSelection();

        if (!editor || !selection || selection.rangeCount === 0) {
          insertAtCursor(html);
          return;
        }

        const range = selection.getRangeAt(0);

        if (!editor.contains(range.commonAncestorContainer)) {
          insertAtEnd(html);
          return;
        }

        range.collapse(false);
        insertHtmlAtRange(range, html);
        emitChange();
        updateSelectionState();
      },
      [emitChange, updateSelectionState],
    );

    const insertAtEnd = React.useCallback(
      (html: string) => {
        const editor = editorRef.current;

        if (!editor) {
          return;
        }

        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        insertHtmlAtRange(range, html);
        emitChange();
        updateSelectionState();
      },
      [emitChange, updateSelectionState],
    );

    const focusEditor = React.useCallback(() => {
      editorRef.current?.focus();
    }, []);

    const runCommand = React.useCallback(
      (command: EditorCommand) => {
        focusEditor();

        if (command === "link") {
          const url = window.prompt("Paste the link URL");

          if (!url) {
            return;
          }

          document.execCommand("createLink", false, url);
        } else if (
          command === "h1" ||
          command === "h2" ||
          command === "paragraph" ||
          command === "blockquote"
        ) {
          const blockTag =
            command === "h1"
              ? "H1"
              : command === "h2"
                ? "H2"
                : command === "blockquote"
                  ? "BLOCKQUOTE"
                  : "P";

          document.execCommand("formatBlock", false, blockTag);
        } else {
          document.execCommand(command, false, undefined);
        }

        emitChange();
        updateSelectionState();
      },
      [emitChange, focusEditor, updateSelectionState],
    );

    React.useImperativeHandle(
      ref,
      () => ({
        runCommand,
        replaceSelection,
        insertAtCursor,
        insertBelowSelection,
        insertAtEnd,
        focus: focusEditor,
        getHtml: () => htmlRef.current,
      }),
      [
        focusEditor,
        insertAtCursor,
        insertAtEnd,
        insertBelowSelection,
        replaceSelection,
        runCommand,
      ],
    );

    React.useEffect(() => {
      const editor = editorRef.current;

      if (!editor || editor.innerHTML === initialHtml) {
        return;
      }

      editor.innerHTML = initialHtml;
      htmlRef.current = initialHtml;
    }, [initialHtml]);

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
      const text = event.clipboardData.getData("text/plain");
      event.preventDefault();
      document.execCommand("insertText", false, text);
      emitChange();
      updateSelectionState();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Tab") {
        event.preventDefault();
        document.execCommand("insertText", false, "  ");
        emitChange();
        updateSelectionState();
      }
    };

    return (
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline
        suppressContentEditableWarning
        data-placeholder="Start writing your document..."
        className={cn(
          "editor-content w-full min-h-[60vh] outline-none transition focus:ring-0 text-gray-900 dark:text-gray-100 leading-relaxed text-base",
          className,
        )}
        onInput={emitChange}
        onKeyUp={updateSelectionState}
        onMouseUp={updateSelectionState}
        onBlur={updateSelectionState}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
      />
    );
  },
);

DocumentEditor.displayName = "DocumentEditor";

export default DocumentEditor;