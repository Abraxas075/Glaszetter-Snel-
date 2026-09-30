import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { MeetbonScreen } from '../../../src/screens/MeetbonScreen';
export default function MeetbonPage() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user, isLoading } = useAuth();
  if (isLoading) return <Text>Laden…</Text>;
  if (!user) return <Redirect href="/login" />;
  return <MeetbonScreen jobId={jobId!} />;
}
