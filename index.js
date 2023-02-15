const execute = async ({ download, close }, save, downloads, results) => {
  const iterate = async () => {
    const itemToDownload = downloads.shift()
    if (!itemToDownload) return

    await download(itemToDownload)
      .then(async (result) => {
        await save(result)
        results.push(result)

        if (downloads.length) {
          await iterate()
        }
      })
      .catch(async (e) => {
        throw e
      })
  }

  await iterate()
  close()
}

const pooledDownload = async (connect, save, downloadList, maxConcurrency) => {
  const results = []
  const downloads = JSON.parse(JSON.stringify(downloadList))

  if (downloads.length) {
    const executions = [],
      connections = []

    // open all connections to execute downloading recursion
    for (let i = 0; i < maxConcurrency; i++) {
      try {
        const connection = await connect()
        connections.push(connection)
      } catch {
        break
      }
    }

    // checks if no connection is available
    if (!connections.length) {
      throw new Error("connection failed")
    }

    // prepare parallel executions and checks if some error has thrown
    connections.forEach((connection) => {
      executions.push(
        execute(connection, save, downloads, results).catch((e) => {
          connections.forEach((con) => con.close())
          throw e
        }),
      )
    })

    // wait for all executions to finish
    await Promise.all(executions).catch((e) => {
      throw e
    })
  }

  return results
}

module.exports = pooledDownload
