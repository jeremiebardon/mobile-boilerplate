import React from 'react';
import * as ReactNative from 'react-native';

import { render, screen } from '@testing-library/react-native';

import AppTabs from '../app-tabs';

describe('<AppTabs />', () => {
  it('renders correctly with light scheme when unspecified', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('unspecified' as any);

    await render(<AppTabs />);
    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByTestId('native-tabs')).toBeOnTheScreen();
  });

  it('renders correctly with dark scheme', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    await render(<AppTabs />);
    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByTestId('native-tabs')).toBeOnTheScreen();
  });

  it('renders correctly with light scheme', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    await render(<AppTabs />);
    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByTestId('native-tabs')).toBeOnTheScreen();
  });
});
