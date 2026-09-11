import React from 'react';
import { Text, View } from 'react-native';

const TriggerLabel = ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>;
TriggerLabel.displayName = 'NativeTabsTriggerLabel';

const TriggerIcon = () => null;
TriggerIcon.displayName = 'NativeTabsTriggerIcon';

const Trigger = ({ children }: { children?: React.ReactNode; name: string }) => (
  <View>{children}</View>
);
Trigger.displayName = 'NativeTabsTrigger';
Trigger.Label = TriggerLabel;
Trigger.Icon = TriggerIcon;

export const NativeTabs = ({ children }: { children: React.ReactNode; [key: string]: any }) => (
  <View testID="native-tabs">{children}</View>
);
NativeTabs.displayName = 'NativeTabs';
NativeTabs.Trigger = Trigger;