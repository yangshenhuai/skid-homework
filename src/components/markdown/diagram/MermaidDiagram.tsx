import mermaid from "mermaid";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useEffect, useRef } from "react";

export type MermaidDiagramProps = {
  code: string;
};

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && code) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
      });
      mermaid.run({
        nodes: [ref.current],
      });
    }
  }, [code]);

  if (!code) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <style jsx global>{`
        .react-transform-wrapper,
        react-transform-component {
          width: 100%;
          height: 100%;
        }
      `}</style>
      <TransformWrapper>
        <TransformComponent>
          <div ref={ref} className="mermaid">
            {code}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
