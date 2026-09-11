export const preventAutoHideAsync = jest.fn();
export const hideAsync = jest.fn().mockResolvedValue(true);

export default {
  preventAutoHideAsync,
  hideAsync,
};
