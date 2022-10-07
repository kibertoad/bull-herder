export function waitUntilTrue(predicateFn: () => Promise<boolean>, sleepAmount = 100) {
  return new Promise((resolve) => {
    async function performCheck() {
      const result = await predicateFn()
      if (result) {
        resolve(result)
      } else {
        setTimeout(performCheck, sleepAmount)
      }
    }
    void performCheck()
  })
}
