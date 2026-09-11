import * as RN from 'react-native';

import { renderHook } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';

import { useColorScheme } from '../use-color-scheme';
import { useTheme } from '../use-theme';

describe('useTheme hook & useColorScheme', () => {
  it('exports useColorScheme from react-native', () => {
    expect(typeof useColorScheme).toBe('function');
  });

  it('returns light theme when color scheme is unspecified', async () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('unspecified' as any);

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toEqual(Colors.light);
  });

  it('returns dark theme when color scheme is dark', async () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toEqual(Colors.dark);
  });

  it('returns light theme when color scheme is light', async () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('light');

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toEqual(Colors.light);
  });
});
