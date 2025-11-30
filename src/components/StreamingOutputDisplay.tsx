import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type StreamingOutputDisplayProps = {
  title?: string;
  description?: string;
  output: string | null;
  className?: string;
  placeholder?: string;
};

export default function StreamingOutputDisplay({
  title = "AI Output",
  description,
  output,
  className,
  placeholder = "Waiting for AI response...",
}: StreamingOutputDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);

  const shouldAutoScrollRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const scrollAreaRoot = scrollAreaRef.current;
    if (!scrollAreaRoot) return;

    const viewport = scrollAreaRoot.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;

    if (!viewport) return;
    viewportRef.current = viewport;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;

      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottom = distanceFromBottom <= 50;

      shouldAutoScrollRef.current = isAtBottom;

      setShowScrollButton(!isAtBottom);
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || !shouldAutoScrollRef.current) return;

    const rAF = requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });

    return () => cancelAnimationFrame(rAF);
  }, [output]);

  const scrollToBottom = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    shouldAutoScrollRef.current = true;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });

    setShowScrollButton(false);
  };

  return (
    <Card className={cn("h-[400px] flex flex-col relative", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="flex-grow overflow-hidden relative p-0">
        <ScrollArea ref={scrollAreaRef} className="h-full w-full">
          <div className="p-4">
            <pre className="text-sm">
              <code className="whitespace-pre-wrap break-words font-mono">
                {output || (
                  <span className="text-muted-foreground italic">
                    {placeholder}
                  </span>
                )}
                <div className="h-px w-full" />
              </code>
            </pre>
          </div>
        </ScrollArea>

        {showScrollButton && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-4 right-4 rounded-full shadow-lg opacity-90 hover:opacity-100 transition-opacity z-10 bg-primary/10 hover:bg-primary/20 backdrop-blur-sm"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
