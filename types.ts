export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ProcessedResult {
  originalImage: string; // Base64
  processedImage: string; // Base64
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}