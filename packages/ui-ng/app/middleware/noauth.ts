export default defineNuxtRouteMiddleware((_to, _from) => {
  if (api.isLoggedIn.value) return navigateTo('/')
})
