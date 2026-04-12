interface DepInfo {
    name: string;
    found: boolean;
    installHint: string;
}
interface Props {
    deps: DepInfo[];
}
export default function DepError({ deps }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=dep-error.d.ts.map