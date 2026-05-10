type MessageRoute = {
  success: boolean;
  code: number;
  message: string;
  data?: any;
};

// reusable function for return message route
export function createMessageRoute(
  success: boolean,
  code: number,
  message: string,
  data?: any,
): MessageRoute {
  return {
    success,
    code,
    message,
    data,
  };
}
