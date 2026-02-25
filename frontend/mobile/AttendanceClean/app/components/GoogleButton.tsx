import React from 'react'
import { Button } from 'react-native'

interface Props {
  title: string
  onPress: () => void
}

export default function GoogleButton({ title, onPress }: Props) {
  return (
    <Button
      title={title}
      onPress={onPress}
      color="#DB4437"
    />
  )
}