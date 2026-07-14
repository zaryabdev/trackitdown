export type ScanItemKind = "FOLDER" | "VIDEO" | "ARCHIVE";

export type ScanItem = {
    relativePath: string;
    parentPath: string;
    name: string;
    normalizedName: string;
    kind: ScanItemKind;
    extension: string | null;
    sizeBytes: string;
};

export type ScanWarning = {
    path: string;
    message: string;
};

export type ScanOptions = {
    onWarning?: (warning: ScanWarning) => void;
};
