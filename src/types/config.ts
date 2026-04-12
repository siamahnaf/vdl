export interface VdlConfig {
  downloadDir: string;
  defaultFormat: 'video' | 'audio' | 'ask';
  preferredQuality: string;
  firstRun: boolean;
}

export const DEFAULT_CONFIG: VdlConfig = {
  downloadDir: '',
  defaultFormat: 'ask',
  preferredQuality: 'ask',
  firstRun: true,
};
