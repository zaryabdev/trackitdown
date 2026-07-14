import { access } from "node:fs/promises";

import { select } from "@inquirer/prompts";
import type { Command } from "commander";
import ora from "ora";

import { loadConfig, type RegisteredDrive } from "../config/config.js";
import { readDriveMarker } from "../drives/drive-marker.js";
import { scanDrive } from "../scanner/scanner.js";
import { ui } from "../ui.js";
import { formatBytes } from "../utils/format-bytes.js";

type ScanCommandOptions = {
    drive?: string;
};

const isDriveAvailable = async (drive: RegisteredDrive): Promise<boolean> =>
    access(drive.rootPath).then(
        () => true,
        () => false,
    );

const findSelectedDrive = (
    drives: RegisteredDrive[],
    selector: string,
): RegisteredDrive | undefined => {
    const normalizedSelector = selector.toLocaleLowerCase("en-US");

    return drives.find(
        (drive) =>
            drive.id === selector ||
            drive.publicId === selector ||
            drive.alias.toLocaleLowerCase("en-US") === normalizedSelector,
    );
};

const selectDrive = async (
    options: ScanCommandOptions,
): Promise<RegisteredDrive> => {
    const config = await loadConfig();

    if (!config.computer) {
        throw new Error("Register this computer before scanning a drive.");
    }

    const availableDrives: RegisteredDrive[] = [];

    for (const drive of config.drives) {
        if (await isDriveAvailable(drive)) {
            availableDrives.push(drive);
        }
    }

    if (availableDrives.length === 0) {
        throw new Error("No registered drives are currently available.");
    }

    if (options.drive) {
        const selectedDrive = findSelectedDrive(availableDrives, options.drive);

        if (!selectedDrive) {
            throw new Error(`Available drive not found: ${options.drive}`);
        }

        return selectedDrive;
    }

    return select<RegisteredDrive>({
        message: "Which drive do you want to scan?",
        choices: availableDrives.map((drive) => ({
            name: `${drive.alias} (${drive.rootPath})`,
            value: drive,
            description: drive.publicId ?? "Not synced to the cloud yet",
        })),
    });
};

const runScan = async (options: ScanCommandOptions): Promise<void> => {
    const drive = await selectDrive(options);
    const marker = await readDriveMarker(drive.rootPath);

    if (!marker) {
        throw new Error(
            `The identity marker is missing from "${drive.alias}".`,
        );
    }

    if (marker.driveId !== drive.id) {
        throw new Error(
            `Drive identity mismatch for "${drive.alias}". Scan stopped for safety.`,
        );
    }

    const spinner = ora(`Scanning ${drive.alias}...`).start();

    let videoCount = 0;
    let archiveCount = 0;
    let folderCount = 0;
    let totalSizeBytes = 0n;
    let warningCount = 0;

    try {
        for await (const item of scanDrive(drive.rootPath, {
            onWarning: () => {
                warningCount += 1;
            },
        })) {
            switch (item.kind) {
                case "VIDEO":
                    videoCount += 1;
                    totalSizeBytes += BigInt(item.sizeBytes);
                    break;

                case "ARCHIVE":
                    archiveCount += 1;
                    totalSizeBytes += BigInt(item.sizeBytes);
                    break;

                case "FOLDER":
                    folderCount += 1;
                    break;
            }

            const totalFiles = videoCount + archiveCount;

            if (totalFiles % 100 === 0 && totalFiles > 0) {
                spinner.text = `Scanning ${drive.alias} — ${totalFiles.toLocaleString()} files found`;
            }
        }

        spinner.succeed(`Scan completed for ${drive.alias}`);
    } catch (error) {
        spinner.fail(`Scan failed for ${drive.alias}`);
        throw error;
    }

    console.log();
    console.log(ui.heading("Scan summary"));
    console.log();
    console.log(
        `${ui.label("Videos:")} ${ui.value(videoCount.toLocaleString())}`,
    );
    console.log(
        `${ui.label("Archives:")} ${ui.value(archiveCount.toLocaleString())}`,
    );
    console.log(
        `${ui.label("Folders:")} ${ui.value(folderCount.toLocaleString())}`,
    );
    console.log(
        `${ui.label("Indexed size:")} ${ui.value(formatBytes(totalSizeBytes))}`,
    );

    if (warningCount > 0) {
        console.log(
            `${ui.label("Unreadable paths:")} ${ui.warning(
                warningCount.toLocaleString(),
            )}`,
        );
    }

    console.log();
    console.log(ui.label("Local scan only. No metadata was uploaded."));
};

export const registerScanCommand = (program: Command): void => {
    program
        .command("scan")
        .description("Scan a registered drive without uploading")
        .option("-d, --drive <id-or-alias>", "drive ID or alias")
        .action(runScan);
};
