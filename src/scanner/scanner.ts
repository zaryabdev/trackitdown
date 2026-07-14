import { opendir, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

import { DRIVE_MARKER_FILENAME } from "../drives/drive-marker.js";
import type { ScanItem, ScanItemKind, ScanOptions } from "./scanner.types.js";

const supportedVideoExtensions = new Set([
    ".mp4",
    ".mkv",
    ".avi",
    ".mov",
    ".wmv",
    ".webm",
    ".m4v",
    ".mpeg",
    ".mpg",
    ".ts",
    ".m2ts",
]);

const supportedArchiveExtensions = new Set([".zip", ".rar"]);

const ignoredDirectoryNames = new Set([
    "$recycle.bin",
    ".git",
    ".spotlight-v100",
    ".trashes",
    ".fseventsd",
    "node_modules",
    "system volume information",
]);

const normalizeName = (name: string): string =>
    name
        .normalize("NFKC")
        .toLocaleLowerCase("en-US")
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const toPortablePath = (path: string): string => path.split(sep).join("/");

const getFileKind = (extension: string): ScanItemKind | null => {
    if (supportedVideoExtensions.has(extension)) {
        return "VIDEO";
    }

    if (supportedArchiveExtensions.has(extension)) {
        return "ARCHIVE";
    }

    return null;
};

export async function* scanDrive(
    rootPath: string,
    options: ScanOptions = {},
): AsyncGenerator<ScanItem> {
    async function* visitDirectory(
        absoluteDirectoryPath: string,
    ): AsyncGenerator<ScanItem, boolean> {
        let directory;

        try {
            directory = await opendir(absoluteDirectoryPath);
        } catch (error) {
            options.onWarning?.({
                path: absoluteDirectoryPath,
                message:
                    error instanceof Error
                        ? error.message
                        : "Unable to read directory.",
            });

            return false;
        }

        let containsSupportedItems = false;

        for await (const entry of directory) {
            if (entry.name === DRIVE_MARKER_FILENAME) {
                continue;
            }

            if (entry.isSymbolicLink()) {
                continue;
            }

            const absoluteEntryPath = join(absoluteDirectoryPath, entry.name);

            if (entry.isDirectory()) {
                const normalizedDirectoryName =
                    entry.name.toLocaleLowerCase("en-US");

                if (ignoredDirectoryNames.has(normalizedDirectoryName)) {
                    continue;
                }

                const childContainsSupportedItems =
                    yield* visitDirectory(absoluteEntryPath);

                if (!childContainsSupportedItems) {
                    continue;
                }

                const relativePath = toPortablePath(
                    relative(rootPath, absoluteEntryPath),
                );

                const parentPath = toPortablePath(
                    relative(rootPath, absoluteDirectoryPath),
                );

                yield {
                    relativePath,
                    parentPath: parentPath === "." ? "" : parentPath,
                    name: entry.name,
                    normalizedName: normalizeName(entry.name),
                    kind: "FOLDER",
                    extension: null,
                    sizeBytes: "0",
                };

                containsSupportedItems = true;
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const extension = extname(entry.name).toLocaleLowerCase("en-US");

            const kind = getFileKind(extension);

            if (!kind) {
                continue;
            }

            try {
                const fileStats = await stat(absoluteEntryPath);

                const relativePath = toPortablePath(
                    relative(rootPath, absoluteEntryPath),
                );

                const parentPath = toPortablePath(
                    relative(rootPath, absoluteDirectoryPath),
                );

                yield {
                    relativePath,
                    parentPath: parentPath === "." ? "" : parentPath,
                    name: entry.name,
                    normalizedName: normalizeName(entry.name),
                    kind,
                    extension,
                    sizeBytes: fileStats.size.toString(),
                };

                containsSupportedItems = true;
            } catch (error) {
                options.onWarning?.({
                    path: absoluteEntryPath,
                    message:
                        error instanceof Error
                            ? error.message
                            : "Unable to read file metadata.",
                });
            }
        }

        return containsSupportedItems;
    }

    yield* visitDirectory(rootPath);
}
