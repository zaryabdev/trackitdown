import chalk from "chalk";

export const ui = {
    brand: (text: string): string => chalk.bold.cyan(text),
    heading: (text: string): string => chalk.bold.white(text),
    label: (text: string): string => chalk.dim(text),
    value: (text: string): string => chalk.white(text),
    success: (text: string): string => chalk.green(text),
    warning: (text: string): string => chalk.yellow(text),
    error: (text: string): string => chalk.red(text),
    command: (text: string): string => chalk.cyan(text),
};

export const printBrand = (): void => {
    console.log();
    console.log(ui.brand("TrackItDown"));
    console.log(ui.label("Your drives, searchable anywhere."));
    console.log();
};
