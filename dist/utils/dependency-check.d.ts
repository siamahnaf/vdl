interface DepStatus {
    name: string;
    found: boolean;
    version: string;
    installHint: string;
}
export declare function checkDependencies(): Promise<{
    allFound: boolean;
    deps: DepStatus[];
}>;
export {};
//# sourceMappingURL=dependency-check.d.ts.map