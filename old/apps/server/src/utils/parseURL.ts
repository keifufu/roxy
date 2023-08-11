export const parseURL = (url: string) => {
  const parsedUrl = new URL(url)
  return {
    protocol: parsedUrl.protocol.replace(':', ''),
    host: parsedUrl.host,
    path: parsedUrl.pathname
  }
}