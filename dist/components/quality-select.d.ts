import type { VideoFormat } from '../types/video.js';
interface Props {
    formats: VideoFormat[];
    title: string;
    onSelect: (format: VideoFormat) => void;
}
export default function QualitySelect({ formats, title, onSelect }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=quality-select.d.ts.map