export default defineNuxtPlugin(() => {
  const { config } = useTransparentUX()
  const forceInteractive = useLocalStorage('forceInteractive', '')
  watch(
    [config, forceInteractive],
    ([{ nonInteractive }, forceInteractive]) => {
      const nuxtElement = document.getElementById('__nuxt')!
      nuxtElement.style.opacity = nonInteractive && !forceInteractive ? '0' : '1'
    },
    { immediate: true }
  )
})
