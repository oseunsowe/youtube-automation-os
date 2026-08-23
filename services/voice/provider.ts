export interface VoiceProvider {
  readonly name: string;
  synthesizeToFile(text: string, voice: string, outDir: string, fileName: string): Promise<string>;
}
