import { FileValidator } from "@nestjs/common";

export interface CustomUploadTypeValidatorOptions {
    fileType: string[];
}

export class CustomUploadFileTypeValidator extends FileValidator {
    private _allowedMimeTypes: string[];

    constructor(
        protected readonly validationOptions: CustomUploadTypeValidatorOptions,
    ) {
        super(validationOptions);
        this._allowedMimeTypes = this.validationOptions.fileType;
    }

    public isValid(file: any) {
        return this._allowedMimeTypes.includes(file.mimetype);
    }

    public buildErrorMessage() {
        return `Upload not allowed. Upload only files of type: ${this._allowedMimeTypes.join(
            ", ",
        )}`;
    }
}
