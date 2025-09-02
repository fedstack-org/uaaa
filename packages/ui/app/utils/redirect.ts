export const redirectToApp = (appId: string, href: string) => {
  location.href = href
  // Use farewell page as a fallback when href is too slow to load
  navigateTo({ path: '/farewell', query: { appId } })
}
