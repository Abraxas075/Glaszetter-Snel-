import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { sapphire } from '../constants/sapphire';
export type MenuIconName =
  'grid' | 'clipboard' | 'message-square' | 'user' | 'map' | 'calendar' | 'measure' | 'users';
export function MenuIcon({
  name,
  size = 28,
  active = true,
  accent = true,
}: {
  name: MenuIconName;
  size?: number;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <View accessible={false} style={{ width: size + 4, height: size + 4 }}>
      {name === 'measure' ? (
        <View
          style={{
            width: size * 0.9,
            height: size * 0.45,
            borderWidth: 1.5,
            borderColor: sapphire.blue,
            marginTop: size * 0.25,
            transform: [{ rotate: '-35deg' }],
          }}
        >
          {[0.2, 0.4, 0.6, 0.8].map((position, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: `${position * 100}%`,
                top: 0,
                width: 1.5,
                height: size * 0.18,
                backgroundColor: index === 2 ? sapphire.red : sapphire.blue,
              }}
            />
          ))}
        </View>
      ) : (
        <Feather name={name} size={size} color={active ? sapphire.blue : sapphire.muted} />
      )}
      {name === 'clipboard' && size >= 30 && (
        <Feather
          name="check"
          size={size * 0.55}
          color={sapphire.red}
          style={{ position: 'absolute', left: size * 0.23, top: size * 0.39 }}
        />
      )}
      {accent && (
        <View
          style={{
            position: 'absolute',
            right: 2,
            bottom: 3,
            width: 7,
            height: 3,
            backgroundColor: sapphire.red,
          }}
        />
      )}
    </View>
  );
}
