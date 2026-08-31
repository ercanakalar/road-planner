import { Injectable, StreamableFile } from "@nestjs/common";
import { createReadStream, existsSync } from "fs";
import { join } from "path";

@Injectable()
export class FileManagementService {
    constructor() {}

    downloadFile(name: string) {
        const folder = join(process.cwd(), `../uploads/${name}`);
        if (!existsSync(folder)) {
            throw new Error("File not found");
        }

        const file = createReadStream(folder);

        return new StreamableFile(file, {
            disposition: `attachment; filename="${name}"`,
        });
    }
}
