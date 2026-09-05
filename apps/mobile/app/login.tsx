import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { LoginScreen } from '../src/screens/LoginScreen';

export default function Login() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Redirect href="/" />;
  }

  return <LoginScreen />;
}
