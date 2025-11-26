import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and overlay
  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Render overlay with underlines
  const renderOverlay = () => {
    if (!value || feedbackItems.length === 0) {
      return null;
    }

    const sorted = [...feedbackItems].sort((a, b) => a.range.start - b.range.start);
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    sorted.forEach((item, idx) => {
      const { start, end } = item.range;

      // Add plain text before this feedback item
      if (start > currentIndex) {
        segments.push(
          <span key={`plain-${idx}-${currentIndex}`} className="invisible">
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
            e.preventDefault();
            e.stopPropagation();
            onFeedbackClick(item.id);
          }}
        >
          {value.slice(start, end)}
        </span>
      );

      currentIndex = end;
    });

    // Add remaining text
    if (currentIndex < value.length) {
      segments.push(
        <span key={`plain-end-${currentIndex}`} className="invisible">
          {value.slice(currentIndex)}
        </span>
      );
    }

    return segments;
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        onScroll={handleScroll}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "min-h-[500px] font-serif text-base leading-relaxed resize-none",
          className
        )}
      />
      {feedbackItems.length > 0 && (
        <div
          ref={overlayRef}
          className="absolute inset-0 px-3 py-2 pointer-events-none overflow-hidden"
          style={{
            fontSize: "inherit",
            lineHeight: "inherit",
            fontFamily: "inherit",
          }}
        >
          <div
            className="whitespace-pre-wrap break-words font-serif text-base leading-relaxed pointer-events-auto"
            style={{
              color: "transparent",
            }}
          >
            {renderOverlay()}
          </div>
        </div>
      )}
    </div>
  );
};
