import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/navigation'

import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import StudentHomeScreen from '../screens/StudentHomeScreen'
import ProfessorHomeScreen from '../screens/ProfessorHomeScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
      <Stack.Screen name="ProfessorHome" component={ProfessorHomeScreen} />
    </Stack.Navigator>
  )
}