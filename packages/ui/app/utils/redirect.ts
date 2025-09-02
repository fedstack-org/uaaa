export const redirectToApp = async (appId: string, href: string) => {
  // Use farewell page as a fallback when href is too slow to load
  await navigateTo({ path: '/farewell', query: { appId } })
  location.href = href
}
