declare module "react-force-graph-2d" {
  import type { ComponentType, Ref } from "react";

  export type ForceGraphNode = {
    id?: string | number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    [key: string]: unknown;
  };

  export type ForceGraphLink = {
    source: string | number | ForceGraphNode;
    target: string | number | ForceGraphNode;
    [key: string]: unknown;
  };

  export type ForceGraphData = {
    nodes: ForceGraphNode[];
    links: ForceGraphLink[];
  };

  export interface ForceGraph2DProps {
    graphData: ForceGraphData;
    nodeAutoColorBy?: string | ((node: ForceGraphNode) => string | number);
    cooldownTime?: number;
    width?: number;
    height?: number;
    d3VelocityDecay?: number;
    nodePointerAreaPaint?: (
      node: ForceGraphNode,
      color: string,
      ctx: CanvasRenderingContext2D
    ) => void;
    nodeCanvasObject?: (
      node: ForceGraphNode,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => void;
    onNodeHover?: (node: ForceGraphNode | null, prev?: ForceGraphNode | null) => void;
    onNodeClick?: (node: ForceGraphNode, event?: MouseEvent) => void;
  }

  // Public instance API (subset used by our app)
  export interface ForceGraph2DInstance {
    // Getter/setter: when provided a value, sets and returns new value; when omitted, returns current
    d3VelocityDecay: (val?: number) => number;
    d3ReheatSimulation: () => void;
    pauseAnimation: () => void;
    resumeAnimation: () => void;
    zoomToFit: (
      ms?: number,
      padding?: number,
      nodeFilter?: (node: ForceGraphNode) => boolean
    ) => void;
  }

  // The library's default export is a React component
  const ForceGraph2D: ComponentType<ForceGraph2DProps & { ref?: Ref<ForceGraph2DInstance | null> }>;
  export default ForceGraph2D;
}


