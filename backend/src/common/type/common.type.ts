export interface CustomRequest extends Request {
    user: {
        institutionId: string;
    };
}
