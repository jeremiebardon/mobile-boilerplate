import React, { createContext } from 'react';
import { View } from 'react-native';

const inset = { top: 40, right: 0, bottom: 20, left: 0 };
const frame = { x: 0, y: 0, width: 390, height: 844 };

export const SafeAreaInsetsContext = createContext(inset);
export const SafeAreaFrameContext = createContext(frame);

export const SafeAreaProvider = ({ children }: any) =>
  React.createElement(
    SafeAreaFrameContext.Provider,
    { value: frame },
    React.createElement(SafeAreaInsetsContext.Provider, { value: inset }, children)
  );
export const SafeAreaConsumer = ({ children }: any) => children(inset);
export const SafeAreaView = ({ children, ...props }: any) =>
  React.createElement(View, props, children);
export const useSafeAreaInsets = () => inset;
export const useSafeAreaFrame = () => frame;
export const initialWindowMetrics = {
  insets: inset,
  frame,
};

export default {
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  SafeAreaProvider,
  SafeAreaConsumer,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  initialWindowMetrics,
};
