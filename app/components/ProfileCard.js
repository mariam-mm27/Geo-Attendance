import { useEffect, useState } from "react";
import { getUserProfile } from "../../services/profileService";
import { Text, View } from "react-native";

export default function ProfileCard() {

  const [profile, setProfile] = useState(null);

  useEffect(() => {

    const loadProfile = async () => {
      const data = await getUserProfile();
      setProfile(data);
    };

    loadProfile();

  }, []);

  if (!profile) {
    return <Text>Loading profile...</Text>;
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>Name: {profile.name}</Text>
      <Text>Email: {profile.email}</Text>
      <Text>Role: {profile.role}</Text>
    </View>
  );
}