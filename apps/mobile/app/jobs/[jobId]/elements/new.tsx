import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { NewMeasurementScreen } from '../../../../src/screens/NewMeasurementScreen';
import { colors } from '../../../../src/constants/colors';

export default function NewElement() {
  const { user, isLoading } = useAuth();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <NewMeasurementScreen jobId={jobId!} />;
}
