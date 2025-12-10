export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  x: number;
  y: number;
  isStart: boolean;
}

export interface Drawing {
  id: string;
  time: number;
  color: string;
  size: number;
  path: DrawingPath[];
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  time: number;
  text: string;
  color: string;
}

export interface Clip {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  speed: number;
  zoomX: number; // 0-1 percentage
  zoomY: number; // 0-1 percentage
}

export interface AnalysisData {
  version: string;
  notes: string;
  drawings: Drawing[];
  annotations: Annotation[];
  clips: Clip[];
  primaryVideoFileName?: string;
}

export type ToolMode = 'point' | 'pen';
