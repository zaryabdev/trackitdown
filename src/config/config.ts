import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

const computerSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    hostname: z.string().min(1),
    operatingSystem: z.enum(["WINDOWS", "MACOS"]),
    registeredAt: z.string().datetime(),
});

const registeredDriveSchema = z.object({
    id: z.string().uuid(),
    publicId: z.string().nullable(),
    alias: z.string().min(1),
    rootPath: z.string().min(1),
    category: z.enum(["MOVIES", "COURSES", "MIXED"]),
    registeredAt: z.string().datetime(),
});

const configSchema = z.object({
    version: z.literal(1),
    computer: computerSchema.nullable(),
    drives: z.array(registeredDriveSchema).default([]),
});

export type TrackItDownConfig = z.infer<typeof configSchema>;
export type RegisteredComputer = z.infer<typeof computerSchema>;
export type RegisteredDrive = z.infer<typeof registeredDriveSchema>;

const configDirectory = join(homedir(), ".trackitdown");
const configPath = join(configDirectory, "config.json");
const temporaryConfigPath = join(configDirectory, "config.tmp.json");

const defaultConfig: TrackItDownConfig = {
    version: 1,
    computer: null,
    drives: [],
};

export const loadConfig = async (): Promise<TrackItDownConfig> => {
    try {
        const contents = await readFile(configPath, "utf8");

        return configSchema.parse(JSON.parse(contents));
    } catch (error) {
        const fileError = error as NodeJS.ErrnoException;

        if (fileError.code === "ENOENT") {
            return defaultConfig;
        }

        if (error instanceof z.ZodError) {
            throw new Error(
                `TrackItDown configuration is invalid: ${configPath}`,
            );
        }

        throw error;
    }
};

export const saveConfig = async (config: TrackItDownConfig): Promise<void> => {
    const validatedConfig = configSchema.parse(config);

    await mkdir(configDirectory, {
        recursive: true,
        mode: 0o700,
    });

    await writeFile(
        temporaryConfigPath,
        `${JSON.stringify(validatedConfig, null, 2)}\n`,
        {
            encoding: "utf8",
            mode: 0o600,
        },
    );

    await rename(temporaryConfigPath, configPath);
};

export const getConfigPath = (): string => configPath;
