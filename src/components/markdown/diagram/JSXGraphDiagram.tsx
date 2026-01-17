import { useEffect, useRef, useState, useId } from "react";
import JXG from "jsxgraph";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type JSXGraphDiagramProps = {
  jesseScript: string;
};

export default function JSXGraphDiagram({ jesseScript }: JSXGraphDiagramProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstance = useRef<JXG.Board | null>(null);

  const [error, setError] = useState<string | null>(null);

  const uniqueId = useId();
  // Sanitize ID for JSXGraph compatibility (remove colons)
  const boardId = `jxgbox-${uniqueId.replace(/:/g, "")}`;

  useEffect(() => {
    // 1. Initial cleanup logic
    const destroyBoard = (): void => {
      if (boardInstance.current) {
        JXG.JSXGraph.freeBoard(boardInstance.current);
        boardInstance.current = null;
      }
    };

    destroyBoard();

    // 2. Logic to update error state safely
    // We use a helper to ensure we don't trigger cascading renders
    const reportError = (message: string | null): void => {
      // Deferring the state update solves the "cascading renders" warning
      setTimeout(() => {
        setError(message);
      }, 0);
    };

    reportError(null);

    if (boardRef.current) {
      try {
        const board = JXG.JSXGraph.initBoard(boardId, {
          boundingbox: [-1, 10, 11, -10],
          axis: true,
          showCopyright: false,
          keepaspectratio: false,
        });

        boardInstance.current = board;

        try {
          board.jc.parse(jesseScript);
        } catch (e: unknown) {
          // Type-safe error handling
          const msg = e instanceof Error ? e.message : String(e);
          reportError(`JesseCode Error: ${msg}`);
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to initialize board";
        reportError(`Initialization Error: ${msg}`);
      }
    }

    return () => destroyBoard();
  }, [jesseScript, boardId]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to parse JesseCode: Syntax Error</AlertTitle>
          <AlertDescription className="font-mono text-xs text-wrap">
            {error}
          </AlertDescription>
        </Alert>
      ) : (
        <div
          id={boardId}
          ref={boardRef}
          className="w-full aspect-3/2 rounded-lg bg-white overflow-hidden"
        />
      )}
    </div>
  );
}
