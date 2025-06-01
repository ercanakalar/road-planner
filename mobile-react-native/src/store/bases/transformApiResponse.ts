interface ApiResponse {
  Response: string;
  [key: string]: any;
}

export const transformApiResponse = <T extends ApiResponse>(data: T): T => {
  if (
    !data ||
    typeof data !== 'object' ||
    data.Response === 'False' ||
    data.Error
  ) {
    throw new Error('Invalid or undefined data received from API');
  }
  if (data.errors) {
    throw new Error(data.errors);
  }
  return data;
};
