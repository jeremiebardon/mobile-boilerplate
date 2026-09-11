import { Text } from 'react-native';

import { render, screen } from '@/test-utils';

import { ThemedView } from '../themed-view';

describe('<ThemedView />', () => {
  it('renders children correctly with default background type', async () => {
    await render(
      <ThemedView>
        <Text>Hello Testing World</Text>
      </ThemedView>
    );

    expect(screen.getByText('Hello Testing World')).toBeOnTheScreen();
  });

  it('applies custom styles', async () => {
    await render(
      <ThemedView testID="themed-view" style={{ padding: 16 }}>
        <Text>Content</Text>
      </ThemedView>
    );

    const element = screen.getByTestId('themed-view');
    expect(element).toBeOnTheScreen();
    expect(element).toHaveStyle({ padding: 16 });
  });

  it('renders with explicit type prop', async () => {
    await render(
      <ThemedView testID="element-themed-view" type="backgroundElement">
        <Text>Element</Text>
      </ThemedView>
    );

    const element = screen.getByTestId('element-themed-view');
    expect(element).toBeOnTheScreen();
  });
});
