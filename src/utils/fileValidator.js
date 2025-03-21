const viewDictionary = 'utils'
export const validateFile = (file, t) => {
  if (!file) return t(`${viewDictionary}.fileRelated`)

  const allowedTypes = ['image/png', 'image/jpeg', 'application/jpg']
  if (!allowedTypes.includes(file.type)) {
    return t(`${viewDictionary}.fileType`)
  }

  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return t(`${viewDictionary}.fileSize`)
  }

  return null
}
