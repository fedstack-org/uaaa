export const credentialIcon = (type: string) => {
  switch (type) {
    case 'password':
      return 'i-lucide-lock'
    case 'email':
      return 'i-lucide-mail'
    case 'phone':
    case 'sms':
      return 'i-lucide-smartphone'
    case 'totp':
      return 'i-lucide-key-round'
    case 'webauthn':
      return 'i-lucide-fingerprint'
    case 'iaaa':
      return 'i-lucide-building-2'
    default:
      return 'i-lucide-lock'
  }
}
