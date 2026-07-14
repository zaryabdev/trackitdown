import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

export const DRIVE_MARKER_FILENAME = ".trackitdown-drive.json";

const driveMarkerSchema = z.object({
    version: z.literal(1),
    driveId: z.string().uuid(),
});

export type DriveMarker = z.infer<typeof driveMarkerSchema>;

const getMarkerPath = (rootPath: string): string =>
    join(rootPath, DRIVE_MARKER_FILENAME);

export const readDriveMarker = async (
    rootPath: string,
): Promise<DriveMarker | null> => {
    try {
        const contents = await readFile(getMarkerPath(rootPath), "utf8");

        return driveMarkerSchema.parse(JSON.parse(contents));
    } catch (error) {
        const fileError = error as NodeJS.ErrnoException;

        if (fileError.code === "ENOENT") {
            return null;
        }

        if (error instanceof z.ZodError) {
            throw new Error(
                `Invalid TrackItDown marker found at ${getMarkerPath(rootPath)}`,
            );
        }

        throw error;
    }
};

export const writeDriveMarker = async (
    rootPath: string,
    marker: DriveMarker,
): Promise<void> => {
    await writeFile(
        getMarkerPath(rootPath),
        `${JSON.stringify(marker, null, 2)}\n`,
        {
            encoding: "utf8",
            flag: "wx",
        },
    );
};
