export function isMissingProfileUfColumn(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false
  const message = error.message ?? ''
  const missingColumn = /profiles\.uf.*(?:does not exist|schema cache)/i.test(message)
    || /(?:could not find|column).*['"]?uf['"]?.*['"]?profiles['"]?.*(?:schema cache|does not exist)/i.test(message)
  return missingColumn && (error.code === '42703' || error.code === 'PGRST204')
}
