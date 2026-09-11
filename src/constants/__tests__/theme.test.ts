import { Platform } from 'react-native';

import { BottomTabInset, Colors, Fonts, MaxContentWidth, Spacing } from '../theme';

describe('theme constants', () => {
  it('defines light and dark color schemes properly', () => {
    expect(Colors.light.background).toBe('#ffffff');
    expect(Colors.light.text).toBe('#000000');
    expect(Colors.dark.background).toBe('#000000');
    expect(Colors.dark.text).toBe('#ffffff');
  });

  it('defines spacing scale and max content width', () => {
    expect(Spacing.one).toBe(4);
    expect(Spacing.six).toBe(64);
    expect(MaxContentWidth).toBe(800);
  });

  it('defines typography font families', () => {
    expect(Fonts?.sans).toBeDefined();
    expect(Fonts?.serif).toBeDefined();
    expect(Fonts?.mono).toBeDefined();
  });

  it('evaluates BottomTabInset on default iOS platform', () => {
    expect(BottomTabInset).toBe(50);
  });

  it('evaluates BottomTabInset on Android platform', () => {
    let androidInset: number;
    jest.isolateModules(() => {
      jest.spyOn(Platform, 'select').mockImplementation((obj: any) => obj.android);
      const theme = jest.requireActual<typeof import('../theme')>('../theme');
      androidInset = theme.BottomTabInset;
    });

    expect(androidInset!).toBe(80);
  });

  it('evaluates BottomTabInset fallback ?? 0 when Platform.select returns undefined', () => {
    let fallbackInset: number;
    jest.isolateModules(() => {
      jest.spyOn(Platform, 'select').mockReturnValue(undefined);
      const theme = jest.requireActual<typeof import('../theme')>('../theme');
      fallbackInset = theme.BottomTabInset;
    });

    expect(fallbackInset!).toBe(0);
  });
});
