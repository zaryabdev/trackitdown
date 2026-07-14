#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
    .name("trackitdown")
    .description("Create searchable snapshots of your drives")
    .version("0.1.0");

program
    .command("hello")
    .description("Verify that the TrackItDown CLI is working")
    .argument("[name]", "name to greet", "User")
    .action((name: string) => {
        console.log(`Hello ${name}, TrackItDown is ready.`);
    });

program.parse();
