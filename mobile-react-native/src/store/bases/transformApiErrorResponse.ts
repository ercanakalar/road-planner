export interface IKeyValue {
  [key: string]: any;
}
export interface IErrorType {
  status: number;
  type: string;
  errors: IKeyValue;
  messages: string[];
  message: string;
  code: number;
}
export const transformApiErrorResponse = (baseQueryReturnValue: any): unknown => {
  return (
    (baseQueryReturnValue?.error as IErrorType) ?? {
      errors: {
        error: 'Bir hata oluştu.',
      },
      message: 'Bir hata oluştu.',
      status: 500,
      code: 500,
    }
  );
};
