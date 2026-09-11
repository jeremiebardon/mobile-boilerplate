import { Text, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';


import { server } from '@/mocks/server';
import { render, screen } from '@/test-utils';

import { apiClient } from '../client';

interface UserData {
  id: string;
  name: string;
  email: string;
}

function UserProfile() {
  const { data, isLoading, isError } = useQuery<UserData>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me');
      return response.data;
    },
  });

  if (isLoading) {
    return <Text testID="loading-state">Loading...</Text>;
  }

  if (isError || !data) {
    return <Text testID="error-state">Error fetching user</Text>;
  }

  return (
    <View>
      <Text testID="user-name">{data.name}</Text>
      <Text testID="user-email">{data.email}</Text>
    </View>
  );
}

describe('<UserProfile /> with MSW & React Query', () => {
  it('renders mocked user data successfully', async () => {
    await render(<UserProfile />);

    expect(await screen.findByTestId('user-name')).toBeOnTheScreen();
    expect(screen.getByText('Test User')).toBeOnTheScreen();
    expect(screen.getByText('user@example.com')).toBeOnTheScreen();
  });

  it('renders error state when API returns an error', async () => {
    server.use(
      http.get('https://api.example.com/users/me', () => {
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
      })
    );

    await render(<UserProfile />);

    expect(await screen.findByTestId('error-state')).toBeOnTheScreen();
    expect(screen.getByText('Error fetching user')).toBeOnTheScreen();
  });
});
