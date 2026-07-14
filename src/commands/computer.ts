import { randomUUID } from "node:crypto";
import { hostname, platform } from "node:os";

import { input } from "@inquirer/prompts";
import type { Command } from "commander";

import {
    getConfigPath,
    loadConfig,
    saveConfig,
    type RegisteredComputer,
} from "../config/config.js";
import { ui } from "../ui.js";

type RegisterOptions = {
    name?: string;
    force?: boolean;
};

const getOperatingSystem = (): RegisteredComputer["operatingSystem"] => {
    const currentPlatform = platform();

    if (currentPlatform === "win32") {
        return "WINDOWS";
    }

    if (currentPlatform === "darwin") {
        return "MACOS";
    }

    throw new Error(
        `TrackItDown currently supports Windows and macOS. Detected: ${currentPlatform}`,
    );
};

const registerComputer = async (options: RegisterOptions): Promise<void> => {
    const config = await loadConfig();

    if (config.computer && !options.force) {
        console.log(
            ui.warning(
                `This computer is already registered as "${config.computer.name}".`,
            ),
        );
        console.log(
            `${ui.label("Use")} ${ui.command("tid computer register --force")} ${ui.label(
                "to replace the local registration.",
            )}`,
        );
        return;
    }

    const suggestedName = hostname();

    const name =
        options.name?.trim() ||
        (
            await input({
                message: "Computer name:",
                default: suggestedName,
                validate: (value) =>
                    value.trim().length > 0 || "Computer name is required.",
            })
        ).trim();

    const computer: RegisteredComputer = {
        id: randomUUID(),
        name,
        hostname: hostname(),
        operatingSystem: getOperatingSystem(),
        registeredAt: new Date().toISOString(),
    };

    await saveConfig({
        ...config,
        computer,
    });

    console.log();
    console.log(ui.success("Computer registered successfully."));
    console.log(`${ui.label("Name:")} ${ui.value(computer.name)}`);
    console.log(`${ui.label("ID:")} ${ui.value(computer.id)}`);
    console.log(
        `${ui.label("Operating system:")} ${ui.value(computer.operatingSystem)}`,
    );
};

const showComputer = async (): Promise<void> => {
    const config = await loadConfig();

    if (!config.computer) {
        console.log(ui.warning("This computer has not been registered."));
        console.log(
            `${ui.label("Run")} ${ui.command("tid computer register")}`,
        );
        return;
    }

    console.log(ui.heading("Registered computer"));
    console.log();
    console.log(`${ui.label("Name:")} ${ui.value(config.computer.name)}`);
    console.log(`${ui.label("ID:")} ${ui.value(config.computer.id)}`);
    console.log(
        `${ui.label("Hostname:")} ${ui.value(config.computer.hostname)}`,
    );
    console.log(
        `${ui.label("Operating system:")} ${ui.value(
            config.computer.operatingSystem,
        )}`,
    );
    console.log(
        `${ui.label("Registered:")} ${ui.value(
            new Date(config.computer.registeredAt).toLocaleString(),
        )}`,
    );
    console.log(`${ui.label("Config:")} ${ui.value(getConfigPath())}`);
};

export const registerComputerCommands = (program: Command): void => {
    const computer = program
        .command("computer")
        .description("Manage this computer's TrackItDown registration");

    computer
        .command("register")
        .description("Register this computer")
        .option("-n, --name <name>", "computer alias")
        .option("--force", "replace an existing local registration")
        .action(registerComputer);

    computer
        .command("show")
        .description("Show this computer's registration")
        .action(showComputer);
};
