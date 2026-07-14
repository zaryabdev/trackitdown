#!/usr/bin/env node

import { Command } from "commander";

import { registerComputerCommands } from "./commands/computer.js";
import { registerDriveCommands } from "./commands/drive.js";
import { printBrand, ui } from "./ui.js";

const program = new Command();

program
    .name("tid")
    .description("Create searchable snapshots of your drives")
    .version("0.1.0")
    .showHelpAfterError();

program.addHelpText("beforeAll", () => {
    printBrand();
    return "";
});

program.configureOutput({
    outputError: (message, write) => {
        write(ui.error(message));
    },
});

registerComputerCommands(program);
registerDriveCommands(program);

try {
    await program.parseAsync();
} catch (error) {
    const message =
        error instanceof Error
            ? error.message
            : "An unexpected error occurred.";

    console.error();
    console.error(ui.error(`Error: ${message}`));
    process.exitCode = 1;
}
