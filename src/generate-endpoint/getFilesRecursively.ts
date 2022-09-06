import { readdirSync, statSync } from "fs";
import { join } from "path";

// // // //

const isDirectory = (path: string) => statSync(path).isDirectory();

const getDirectories = (path: string) =>
    readdirSync(path)
        .map((name) => join(path, name))
        .filter(isDirectory);

const isFile = (path: string) => statSync(path).isFile();

const getFiles = (path: string) =>
    readdirSync(path)
        .map((name) => join(path, name))
        .filter(isFile);

/**
 * getFilesRecursively
 * Gets list of files recursively
 * Ganked from:
 * https://stackoverflow.com/questions/41462606/get-all-files-recursively-in-directories-nodejs
 */
export const getFilesRecursively = (path: string): string[] => {
    let dirs = getDirectories(path);
    let files: string[] = dirs
        .map((dir) => getFilesRecursively(dir)) // go through each directory
        .reduce((a, b) => a.concat(b), []); // map returns a 2d array (array of file arrays) so flatten
    return files.concat(getFiles(path));
};
