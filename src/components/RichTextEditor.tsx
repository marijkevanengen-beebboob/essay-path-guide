import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type FeedbackItem = {
  id: string;
  range: { start: number; end: number };
  type: "spelling" | "grammar" | "structure" | "content";
};

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  feedbackItems: FeedbackItem[];
  onFeedbackClick: (id: string) => void;
  activeFeedbackId: string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const getUnderlineColor = (type: FeedbackItem["type"]) => {
  switch (type) {
    case "spelling":
      return "decoration-blue-500";
    case "grammar":
      return "decoration-red-500";
    case "structure":
      return "decoration-orange-500";
    case "content":
      return "decoration-purple-500";
    default:
      return "decoration-gray-500";
  }
};

export const RichTextEditor = ({
  value,
  onChange,
  onPaste,
  feedbackItems,
  onFeedbackClick,
  activeFeedbackId,
  placeholder = "Begin hier met schrijven...",
  className,
  disabled = false,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Render text with underlines
  const renderContent = () => {
    if (!value && !isFocused) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (feedbackItems.length === 0) {
      return value;
    }

    const sorted = [...feedbackItems].sort((a, b) => a.range.start - b.range.start);
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    sorted.forEach((item, idx) => {
      const { start, end } = item.range;

      // Add plain text before this feedback item
      if (start > currentIndex) {
        segments.push(
          <span key={`plain-${idx}-${currentIndex}`}>
            {value.slice(currentIndex, start)}
          </span>
        );
      }

      // Add underlined text for feedback item
      const underlineColor = getUnderlineColor(item.type);
      const isActive = activeFeedbackId === item.id;

      segments.push(
        <span
          key={`feedback-${item.id}`}
          className={cn(
            "underline underline-offset-2 decoration-2 cursor-pointer hover:bg-accent/30 transition-colors rounded-sm px-0.5",
            underlineColor,
            isActive && "bg-accent/50 ring-2 ring-primary ring-offset-1"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onFeedbackClick(item.id);
          }}
          data-feedback-id={item.id}
        >
          {value.slice(start, end)}
        </span>
      );

      currentIndex = end;
    });

    // Add remaining text
    if (currentIndex < value.length) {
      segments.push(
        <span key={`plain-end-${currentIndex}`}>
          {value.slice(currentIndex)}
        </span>
      );
    }

    return segments;
  };

  // Handle input changes
  const handleInput = () => {
    if (!editorRef.current) return;
    const newText = editorRef.current.innerText;
    if (newText !== value) {
      onChange(newText);
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    
    // Insert plain text at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
    onPaste?.(e);
  };

  // Update content when value changes externally
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      const currentText = editorRef.current.innerText;
      if (currentText !== value) {
        editorRef.current.innerText = value;
      }
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      contentEditable={!disabled}
      onInput={handleInput}
      onPaste={handlePaste}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={cn(
        "min-h-[500px] w-full rounded-md border border-input bg-background px-3 py-2 text-base font-serif leading-relaxed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "whitespace-pre-wrap break-words overflow-auto",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{ 
        wordWrap: "break-word",
        overflowWrap: "break-word"
      }}
      suppressContentEditableWarning
    >
      {renderContent()}
    </div>
  );
};
