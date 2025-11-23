import React, { useState, useRef } from 'react'
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'

interface EmailInputProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  style?: any
  domain?: string
  [key: string]: any // Allow other TextInput props
}

const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChangeText,
  placeholder = 'email@example.com',
  style,
  domain = 'gmail.com',
  ...props
}) => {
  const [showSuggestion, setShowSuggestion] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const handleChangeText = (text: string) => {
    const atIndex = text.indexOf('@')
    
    if (atIndex !== -1) {
      const afterAt = text.substring(atIndex + 1)
      
      // Check if there's already a domain after @
      // Show suggestion if no domain is typed yet (no dot means no domain)
      if (afterAt.length === 0 || !afterAt.includes('.')) {
        setShowSuggestion(true)
      } else {
        setShowSuggestion(false)
      }
    } else {
      setShowSuggestion(false)
    }
    
    onChangeText(text)
  }

  const acceptSuggestion = () => {
    const atIndex = value.indexOf('@')
    if (atIndex !== -1) {
      const beforeAt = value.substring(0, atIndex + 1)
      const newValue = beforeAt + domain
      onChangeText(newValue)
      setShowSuggestion(false)
      
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const atIndex = value.indexOf('@')
  const beforeAt = atIndex !== -1 ? value.substring(0, atIndex + 1) : ''
  const displaySuggestion = showSuggestion && beforeAt

  // Debug: Uncomment to test
  // console.log('EmailInput Debug:', { value, showSuggestion, displaySuggestion, beforeAt })

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <TextInput
          {...props}
          ref={inputRef}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, style]}
        />
      </View>
      {displaySuggestion && (
        <TouchableOpacity
          style={styles.suggestion}
          onPress={acceptSuggestion}
          activeOpacity={0.7}
        >
          <Text style={styles.suggestionPrefix}>{beforeAt}</Text>
          <Text style={styles.suggestionDomain}>{domain}</Text>
          <Text style={styles.suggestionHint}>Tap to use</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    minHeight: 50, // Ensure space for suggestion
  },
  container: {
    width: '100%',
  },
  input: {
    width: '100%',
  },
  suggestion: {
    marginTop: 4,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 44,
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  suggestionPrefix: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
    marginRight: 2,
  },
  suggestionDomain: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 8,
  },
  suggestionHint: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
})

export default EmailInput

