export interface TelemetryPacket {
  t: number;
  pose?: { x: number; y: number; h: number };
  vel?: { target: number; actual: number };
  pid?: { err: number; i: number; d: number };
  batt?: number;
  custom?: Record<string, number>;
}

export type ClientMessage =
  | { type: "startRecording" }
  | { type: "stopRecording" }
  | { type: "config"; values: Record<string, number> };