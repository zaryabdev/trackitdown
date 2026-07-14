import { randomUUID } from "node:crypto";
import { realpath, stat } from "node:fs/promises";

import { input, select } from "@inquirer/prompts";
import type { Command } from "commander";

import {
    loadConfig,
    saveConfig,
    type RegisteredDrive,
} from "../config/config.js";
import { readDriveMarker, writeDriveMarker } from "../drives/drive-marker.js";
import { ui } from "../ui.js";

type DriveCategory = RegisteredDrive["category"];

type RegisterDriveOptions = {
    path?: string;
    alias?: string;
    category?: DriveCategory;
};

const resolveDirectory = async (path: string): Promise<string> => {
    const resolvedPath = await realpath(path);
    const pathStats = await stat(resolvedPath);

    if (!pathStats.isDirectory()) {
        throw new Error(
            `The selected path is not a directory: ${resolvedPath}`,
        );
    }

    return resolvedPath;
};

const registerDrive = async (options: RegisterDriveOptions): Promise<void> => {
    const config = await loadConfig();

    if (!config.computer) {
        console.log(ui.warning("Register this computer first."));
        console.log(
            `${ui.label("Run")} ${ui.command("tid computer register")}`,
        );
        return;
    }

    const enteredPath =
        options.path ??
        (await input({
            message: "Drive or folder path:",
            validate: (value) =>
                value.trim().length > 0 || "A path is required.",
        }));

    const rootPath = await resolveDirectory(enteredPath.trim());

    const existingLocalDrive = config.drives.find(
        (drive) => drive.rootPath === rootPath,
    );

    if (existingLocalDrive) {
        console.log(
            ui.warning(
                `This path is already registered as "${existingLocalDrive.alias}".`,
            ),
        );
        return;
    }

    const existingMarker = await readDriveMarker(rootPath);

    if (existingMarker) {
        const knownDrive = config.drives.find(
            (drive) => drive.id === existingMarker.driveId,
        );

        if (knownDrive) {
            console.log(
                ui.warning(
                    `This physical drive is already registered as "${knownDrive.alias}".`,
                ),
            );
            return;
        }

        throw new Error(
            "This drive already contains a TrackItDown identity but is not connected to this local configuration. Reconnection support will be added with the cloud API.",
        );
    }

    const alias =
        options.alias?.trim() ||
        (
            await input({
                message: "Drive alias:",
                validate: (value) =>
                    value.trim().length > 0 || "An alias is required.",
            })
        ).trim();

    const duplicateAlias = config.drives.some(
        (drive) =>
            drive.alias.toLocaleLowerCase("en-US") ===
            alias.toLocaleLowerCase("en-US"),
    );

    if (duplicateAlias) {
        throw new Error(`The drive alias "${alias}" is already in use.`);
    }

    const category =
        options.category ??
        (await select<DriveCategory>({
            message: "Default category:",
            choices: [
                {
                    name: "Movies",
                    value: "MOVIES",
                },
                {
                    name: "Courses",
                    value: "COURSES",
                },
                {
                    name: "Mixed",
                    value: "MIXED",
                },
            ],
        }));

    const drive: RegisteredDrive = {
        id: randomUUID(),
        publicId: null,
        alias,
        rootPath,
        category,
        registeredAt: new Date().toISOString(),
    };

    await writeDriveMarker(rootPath, {
        version: 1,
        driveId: drive.id,
    });

    await saveConfig({
        ...config,
        drives: [...config.drives, drive],
    });

    console.log();
    console.log(ui.success("Drive registered successfully."));
    console.log(`${ui.label("Alias:")} ${ui.value(drive.alias)}`);
    console.log(`${ui.label("Path:")} ${ui.value(drive.rootPath)}`);
    console.log(`${ui.label("Category:")} ${ui.value(drive.category)}`);
    console.log(`${ui.label("Permanent ID:")} ${ui.value(drive.id)}`);
    console.log(
        ui.label("The cloud API will assign its DRIVE_XXX display ID later."),
    );
};

const listDrives = async (): Promise<void> => {
    const config = await loadConfig();

    if (config.drives.length === 0) {
        console.log(ui.warning("No drives are registered."));
        console.log(`${ui.label("Run")} ${ui.command("tid drive register")}`);
        return;
    }

    console.log(ui.heading("Registered drives"));
    console.log();

    for (const drive of config.drives) {
        const displayId = drive.publicId ?? "Not synced";

        console.log(ui.heading(drive.alias));
        console.log(`  ${ui.label("Cloud ID:")} ${ui.value(displayId)}`);
        console.log(`  ${ui.label("Path:")} ${ui.value(drive.rootPath)}`);
        console.log(`  ${ui.label("Category:")} ${ui.value(drive.category)}`);
        console.log(`  ${ui.label("Permanent ID:")} ${ui.value(drive.id)}`);
        console.log();
    }
};

export const registerDriveCommands = (program: Command): void => {
    const drive = program
        .command("drive")
        .description("Manage registered drives");

    drive
        .command("register")
        .description("Register a drive or selected folder")
        .option("-p, --path <path>", "drive or folder path")
        .option("-a, --alias <alias>", "human-friendly drive name")
        .option("-c, --category <category>", "MOVIES, COURSES, or MIXED")
        .action(registerDrive);

    drive
        .command("list")
        .description("List registered drives")
        .action(listDrives);
};
