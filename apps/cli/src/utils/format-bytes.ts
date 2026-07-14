const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export const formatBytes = (bytes: bigint): string => {
    if (bytes === 0n) {
        return "0 B";
    }

    let value = Number(bytes);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const decimals = unitIndex === 0 ? 0 : 2;

    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
};
